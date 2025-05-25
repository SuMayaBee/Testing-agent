/**
 * Real-time transcript monitoring service for the frontend
 * Monitors calls from specific caller to specific recipient and fetches transcription in real-time
 */

import { db } from '../../../lib/firebase-config';
import { collection, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore';

class RealtimeTranscriptMonitor {
  constructor() {
    this.monitoredCalls = new Map(); // call_id -> call_info
    this.lastTranscriptCounts = new Map(); // call_id -> last_count
    this.unsubscribeFunctions = new Map(); // call_id -> unsubscribe function
    this.isRunning = false;
    this.onTranscriptUpdate = null;
    this.onCallStatusChange = null;
    this.onError = null;
  }

  /**
   * Normalize phone number for comparison
   */
  normalizePhoneNumber(phone) {
    if (!phone) return "";
    // Remove all non-digit characters except +
    const normalized = String(phone).replace(/[^\d+]/g, '');
    return normalized;
  }

  /**
   * Check if a phone number matches any in the list
   */
  phoneMatches(phone1, phoneList) {
    if (!phone1 || !phoneList) return false;
    
    const norm1 = this.normalizePhoneNumber(phone1);
    
    // Skip empty or very short numbers
    if (norm1.length < 10) return false;
    
    for (const phone2 of phoneList) {
      const norm2 = this.normalizePhoneNumber(phone2);
      if (norm2.length < 10) continue;
      
      // Check exact match or match without country code
      if (norm1 === norm2 || 
          norm1.endsWith(norm2.slice(-10)) || 
          norm2.endsWith(norm1.slice(-10))) {
        return true;
      }
    }
    return false;
  }

  /**
   * Start monitoring for calls matching the criteria
   */
  async startMonitoring(callerNumbers, recipientNumbers, callbacks = {}) {
    if (this.isRunning) {
      console.warn('Monitor is already running');
      return;
    }

    this.isRunning = true;
    this.onTranscriptUpdate = callbacks.onTranscriptUpdate;
    this.onCallStatusChange = callbacks.onCallStatusChange;
    this.onError = callbacks.onError;

    console.log('🔍 Starting real-time transcript monitoring...');
    console.log('📞 Monitoring calls from:', callerNumbers);
    console.log('📞 Monitoring calls to:', recipientNumbers);

    try {
      // Query for matching calls in phonecall_analytics collection
      const analyticsRef = collection(db, 'phonecall_analytics');
      
      // Set up real-time listener for the entire collection
      // We'll filter in memory since Firestore doesn't support complex OR queries
      const unsubscribe = onSnapshot(analyticsRef, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const callId = change.doc.id;
          const callData = change.doc.data();
          
          if (!callData) return;
          
          const caller = callData.caller || '';
          const toNumber = callData.to || '';
          const callStatus = callData.call_status || '';
          
          // Check if this call matches our criteria
          const callerMatches = this.phoneMatches(caller, callerNumbers);
          const recipientMatches = this.phoneMatches(toNumber, recipientNumbers);
          
          if (callerMatches && recipientMatches) {
            if (change.type === 'added' || change.type === 'modified') {
              this.handleCallUpdate(callId, callData, callStatus);
            } else if (change.type === 'removed') {
              this.stopMonitoringCall(callId);
            }
          }
        });
      }, (error) => {
        console.error('❌ Error in call monitoring:', error);
        if (this.onError) {
          this.onError(error);
        }
      });

      // Store the main unsubscribe function
      this.mainUnsubscribe = unsubscribe;

    } catch (error) {
      console.error('❌ Error starting monitor:', error);
      if (this.onError) {
        this.onError(error);
      }
      this.isRunning = false;
    }
  }

  /**
   * Handle call updates (new calls or status changes)
   */
  async handleCallUpdate(callId, callData, callStatus) {
    // Handle completed or cancelled calls
    if (callStatus === 'completed' || callStatus === 'cancelled') {
      if (this.monitoredCalls.has(callId)) {
        console.log(`✅ Call ${callId.substring(0, 8)}... ${callStatus}. Stopping monitoring.`);
        this.stopMonitoringCall(callId);
        
        if (this.onCallStatusChange) {
          this.onCallStatusChange(callId, callStatus, callData);
        }
      }
      return;
    }

    // Add new calls to monitoring
    if (!this.monitoredCalls.has(callId)) {
      console.log(`🆕 Found active call: ${callId}`);
      console.log(`   📞 ${callData.caller} → ${callData.to}`);
      console.log(`   📊 Status: ${callStatus}`);
      
      this.monitoredCalls.set(callId, {
        callId,
        caller: callData.caller,
        to: callData.to,
        callStatus,
        timestamp: callData.timestamp,
        rawData: callData
      });
      
      this.lastTranscriptCounts.set(callId, 0);
      
      // Start monitoring transcriptions for this call
      this.startTranscriptMonitoring(callId);
      
      if (this.onCallStatusChange) {
        this.onCallStatusChange(callId, 'started', callData);
      }
    } else {
      // Update existing call info
      const existingCall = this.monitoredCalls.get(callId);
      existingCall.callStatus = callStatus;
      existingCall.rawData = callData;
      
      if (this.onCallStatusChange) {
        this.onCallStatusChange(callId, 'updated', callData);
      }
    }
  }

  /**
   * Start monitoring transcriptions for a specific call
   */
  startTranscriptMonitoring(callId) {
    const transcriptionPath = `phonecall_analytics/${callId}/transcription`;
    const transcriptionRef = collection(db, transcriptionPath);
    const transcriptionQuery = query(transcriptionRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(transcriptionQuery, (snapshot) => {
      const transcriptionEntries = [];
      
      snapshot.forEach((doc) => {
        const docData = doc.data();
        if (docData) {
          transcriptionEntries.push({
            documentId: doc.id,
            message: docData.message || '',
            role: docData.role || '',
            timestamp: docData.timestamp || '',
            rawData: docData
          });
        }
      });

      // Check if we have new entries
      const lastCount = this.lastTranscriptCounts.get(callId) || 0;
      if (transcriptionEntries.length > lastCount) {
        const newEntries = transcriptionEntries.slice(lastCount);
        
        // Update the count
        this.lastTranscriptCounts.set(callId, transcriptionEntries.length);
        
        // Notify about new transcriptions
        if (this.onTranscriptUpdate && newEntries.length > 0) {
          this.onTranscriptUpdate(callId, newEntries, transcriptionEntries);
        }
      }
    }, (error) => {
      console.error(`❌ Error monitoring transcriptions for ${callId}:`, error);
      if (this.onError) {
        this.onError(error);
      }
    });

    // Store the unsubscribe function
    this.unsubscribeFunctions.set(callId, unsubscribe);
  }

  /**
   * Stop monitoring a specific call
   */
  stopMonitoringCall(callId) {
    // Remove from monitored calls
    this.monitoredCalls.delete(callId);
    this.lastTranscriptCounts.delete(callId);
    
    // Unsubscribe from transcription updates
    const unsubscribe = this.unsubscribeFunctions.get(callId);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribeFunctions.delete(callId);
    }
  }

  /**
   * Stop all monitoring
   */
  stopMonitoring() {
    if (!this.isRunning) return;
    
    console.log('🛑 Stopping real-time monitoring...');
    
    this.isRunning = false;
    
    // Unsubscribe from main call monitoring
    if (this.mainUnsubscribe) {
      this.mainUnsubscribe();
      this.mainUnsubscribe = null;
    }
    
    // Unsubscribe from all transcription monitoring
    this.unsubscribeFunctions.forEach((unsubscribe) => {
      unsubscribe();
    });
    
    // Clear all data
    this.monitoredCalls.clear();
    this.lastTranscriptCounts.clear();
    this.unsubscribeFunctions.clear();
    
    // Clear callbacks
    this.onTranscriptUpdate = null;
    this.onCallStatusChange = null;
    this.onError = null;
  }

  /**
   * Get currently monitored calls
   */
  getMonitoredCalls() {
    return Array.from(this.monitoredCalls.values());
  }

  /**
   * Check if monitoring is active
   */
  isMonitoring() {
    return this.isRunning;
  }

  /**
   * Manually mark a call as cancelled (for when we cancel from the frontend)
   */
  markCallAsCancelled(callId) {
    if (this.monitoredCalls.has(callId)) {
      console.log(`🛑 Manually marking call ${callId.substring(0, 8)}... as cancelled`);
      const callData = this.monitoredCalls.get(callId);
      callData.callStatus = 'cancelled';
      
      this.stopMonitoringCall(callId);
      
      if (this.onCallStatusChange) {
        this.onCallStatusChange(callId, 'cancelled', callData.rawData);
      }
    }
  }
}

// Export a singleton instance
export const realtimeMonitor = new RealtimeTranscriptMonitor();

// Export the class for creating additional instances if needed
export default RealtimeTranscriptMonitor; 