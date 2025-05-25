/**
 * Firebase service for saving real-time transcripts to the conversations/current document
 */

import { db } from '../../../lib/firebase-config';
import { doc, setDoc, updateDoc, arrayUnion, serverTimestamp, getDoc, deleteDoc } from 'firebase/firestore';

class FirebaseTranscriptService {
  constructor() {
    this.currentConversationRef = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the current conversation document
   */
  async initializeCurrentConversation(organizationUsername, testId, phoneNumber, callSid) {
    try {
      const conversationPath = `organizations/${organizationUsername}/tests/${testId}/conversations/current`;
      this.currentConversationRef = doc(db, conversationPath);
      
      console.log(`🔥 Initializing Firebase conversation at: ${conversationPath}`);
      console.log(`🔥 Firebase DB instance:`, db);
      console.log(`🔥 Document reference:`, this.currentConversationRef);
      
      // Check if document already exists
      const docSnap = await getDoc(this.currentConversationRef);
      console.log(`🔥 Document exists:`, docSnap.exists());
      
      if (!docSnap.exists()) {
        // Create new document
        const initialData = {
          evaluated_at: serverTimestamp(),
          messages: [],
          call_sid: callSid,
          target_phone_number: phoneNumber,
          call_status: 'in_progress',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        };
        
        console.log(`🔥 Creating new document with data:`, initialData);
        await setDoc(this.currentConversationRef, initialData);
        console.log("✅ Created new current conversation document");
      } else {
        // Update existing document
        const updateData = {
          call_sid: callSid,
          target_phone_number: phoneNumber,
          call_status: 'in_progress',
          updated_at: serverTimestamp()
        };
        
        console.log(`🔥 Updating existing document with data:`, updateData);
        await updateDoc(this.currentConversationRef, updateData);
        console.log("✅ Updated existing current conversation document");
      }
      
      this.isInitialized = true;
      console.log(`🔥 Firebase service initialized successfully. isInitialized: ${this.isInitialized}`);
      return true;
    } catch (error) {
      console.error("❌ Error initializing current conversation:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Add a new message to the current conversation
   */
  async addMessage(messageData) {
    if (!this.isInitialized || !this.currentConversationRef) {
      console.warn("⚠️ Firebase transcript service not initialized");
      return false;
    }

    try {
      const messageWithTimestamp = {
        ...messageData,
        timestamp: new Date().toISOString()
      };

      await updateDoc(this.currentConversationRef, {
        messages: arrayUnion(messageWithTimestamp),
        updated_at: serverTimestamp()
      });

      console.log(`📝 Added message to Firebase: ${messageData.agent} - ${messageData.message?.substring(0, 50)}...`);
      return true;
    } catch (error) {
      console.error("❌ Error adding message to Firebase:", error);
      return false;
    }
  }

  /**
   * Add multiple messages to the current conversation
   * Enhanced to handle real-time transcript data from phoneline analytics
   */
  async addMessages(messages) {
    console.log(`🔥 addMessages called with ${messages?.length || 0} messages`);
    console.log(`🔥 isInitialized: ${this.isInitialized}`);
    console.log(`🔥 currentConversationRef:`, this.currentConversationRef);
    
    if (!this.isInitialized || !this.currentConversationRef) {
      console.warn("⚠️ Firebase transcript service not initialized");
      return false;
    }

    if (!messages || messages.length === 0) {
      console.log("📝 No messages to add to Firebase");
      return true;
    }

    try {
      console.log(`🔥 Getting current document to check for duplicates...`);
      // Get current document to check existing messages and avoid duplicates
      const docSnap = await getDoc(this.currentConversationRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      const existingMessages = currentData.messages || [];
      
      console.log(`🔥 Found ${existingMessages.length} existing messages in Firebase`);
      console.log(`🔥 Incoming messages:`, messages);
      
      // Filter out duplicate messages based on content and timestamp
      const newMessages = messages.filter(newMsg => {
        return !existingMessages.some(existingMsg => 
          existingMsg.message === newMsg.message && 
          existingMsg.agent === newMsg.agent &&
          Math.abs(new Date(existingMsg.timestamp?.seconds * 1000 || existingMsg.timestamp) - 
                   new Date(newMsg.timestamp)) < 1000 // Within 1 second
        );
      });

      console.log(`🔥 After filtering duplicates: ${newMessages.length} new messages`);

      if (newMessages.length === 0) {
        console.log("📝 No new messages to add (all duplicates filtered out)");
        return true;
      }

      // Prepare messages with proper structure for simulation page
      // Fixed mapping: OrderingAgent = 'user' (phoneline/restaurant AI), TestAgent = 'agent' (testing/OpenAI)
      const messagesWithTimestamp = newMessages.map(msg => ({
        agent: msg.agent || (msg.role === 'agent' ? 'TestAgent' : 'OrderingAgent'),
        message: msg.message || msg.text || '',
        session_id: msg.session_id || msg.rawData?.session_id || 'unknown',
        timestamp: new Date().toISOString(),
        // Store original timestamp for reference
        original_timestamp: msg.timestamp || new Date().toISOString()
      }));

      console.log(`🔥 Prepared messages for Firebase:`, messagesWithTimestamp);

      // Add all messages in a single update
      const updateData = {
        messages: arrayUnion(...messagesWithTimestamp),
        updated_at: serverTimestamp(),
        message_count: (existingMessages.length + newMessages.length)
      };
      
      console.log(`🔥 Updating Firebase document with:`, updateData);
      await updateDoc(this.currentConversationRef, updateData);

      console.log(`📝 Added ${newMessages.length} new messages to Firebase conversations/current`);
      console.log(`📊 Total messages now: ${existingMessages.length + newMessages.length}`);
      return true;
    } catch (error) {
      console.error("❌ Error adding messages to Firebase:", error);
      console.error("❌ Error details:", {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Update the call status
   */
  async updateCallStatus(status) {
    if (!this.isInitialized || !this.currentConversationRef) {
      console.warn("⚠️ Firebase transcript service not initialized");
      return false;
    }

    try {
      await updateDoc(this.currentConversationRef, {
        call_status: status,
        updated_at: serverTimestamp(),
        ...(status === 'completed' && { completed_at: serverTimestamp() })
      });

      console.log(`📞 Updated call status to: ${status}`);
      return true;
    } catch (error) {
      console.error("❌ Error updating call status:", error);
      return false;
    }
  }

  /**
   * Finalize the conversation with metrics and overall score
   */
  async finalizeConversation(metricsResults, overallScore, additionalData = {}) {
    if (!this.isInitialized || !this.currentConversationRef) {
      console.warn("⚠️ Firebase transcript service not initialized");
      return false;
    }

    try {
      const finalData = {
        call_status: 'completed',
        completed_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        overall_score: overallScore,
        metrics_results: metricsResults,
        ...additionalData
      };

      await updateDoc(this.currentConversationRef, finalData);
      console.log("✅ Finalized conversation with metrics and score");
      return true;
    } catch (error) {
      console.error("❌ Error finalizing conversation:", error);
      return false;
    }
  }

  /**
   * Get the current conversation data
   */
  async getCurrentConversation() {
    if (!this.isInitialized || !this.currentConversationRef) {
      console.warn("⚠️ Firebase transcript service not initialized");
      return null;
    }

    try {
      const docSnap = await getDoc(this.currentConversationRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
      return null;
    } catch (error) {
      console.error("❌ Error getting current conversation:", error);
      return null;
    }
  }

  /**
   * Reset the service
   */
  reset() {
    this.currentConversationRef = null;
    this.isInitialized = false;
    console.log("🔄 Firebase transcript service reset");
  }

  /**
   * Save complete transcript from phoneline analytics (replaces old storage method)
   * This method ensures the transcript is properly saved to conversations/current
   */
  async saveCompleteTranscript(transcriptData) {
    if (!this.isInitialized || !this.currentConversationRef) {
      console.warn("⚠️ Firebase transcript service not initialized");
      return false;
    }

    try {
      // Convert transcript data to the format expected by simulation page
      // Fixed mapping: 'user' speaker = OrderingAgent (phoneline/restaurant AI), 'agent' speaker = TestAgent (testing/OpenAI)
      const formattedMessages = transcriptData.map(entry => ({
        agent: entry.speaker === 'user' ? 'OrderingAgent' : 
               entry.speaker === 'agent' ? 'TestAgent' : 
               entry.speaker === 'system' ? 'system' : 'OrderingAgent',
        message: entry.text || entry.message || '',
        session_id: entry.session_id || 'transcript_save',
        timestamp: new Date().toISOString(),
        original_timestamp: entry.timestamp || new Date().toISOString()
      }));

      // Replace the entire messages array with the complete transcript
      await updateDoc(this.currentConversationRef, {
        messages: formattedMessages,
        updated_at: serverTimestamp(),
        message_count: formattedMessages.length,
        transcript_source: 'phoneline_analytics'
      });

      console.log(`📝 Saved complete transcript to Firebase: ${formattedMessages.length} messages`);
      console.log("📊 Transcript source: phoneline_analytics");
      return true;
    } catch (error) {
      console.error("❌ Error saving complete transcript to Firebase:", error);
      return false;
    }
  }

  /**
   * Ensure transcript is saved to Firebase (fallback method)
   * This method can be called when real-time monitoring ends to ensure all data is saved
   */
  async ensureTranscriptSaved(localTranscript) {
    if (!this.isInitialized || !this.currentConversationRef) {
      console.warn("⚠️ Firebase transcript service not initialized");
      return false;
    }

    try {
      // Get current Firebase data
      const docSnap = await getDoc(this.currentConversationRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      const firebaseMessages = currentData.messages || [];

      // If Firebase has fewer messages than local transcript, update Firebase
      if (firebaseMessages.length < localTranscript.length) {
        console.log(`📝 Firebase has ${firebaseMessages.length} messages, local has ${localTranscript.length}. Updating Firebase...`);
        await this.saveCompleteTranscript(localTranscript);
        return true;
      } else {
        console.log(`✅ Firebase transcript is up to date (${firebaseMessages.length} messages)`);
        return true;
      }
    } catch (error) {
      console.error("❌ Error ensuring transcript is saved:", error);
      return false;
    }
  }

  /**
   * Test Firebase connection and write capabilities
   */
  async testConnection() {
    try {
      console.log("🔥 Testing Firebase connection...");
      
      // Test 1: Check if Firebase is initialized
      if (!this.db) {
        console.error("❌ Firebase database not initialized");
        return false;
      }
      console.log("✅ Firebase database initialized");
      
      // Test 2: Try to create a test document
      const testRef = doc(this.db, 'test', 'connection-test');
      const testData = {
        test: true,
        timestamp: new Date().toISOString(),
        message: 'Firebase connection test'
      };
      
      console.log("🔥 Attempting to write test document...");
      await setDoc(testRef, testData);
      console.log("✅ Successfully wrote test document");
      
      // Test 3: Try to read the test document
      console.log("🔥 Attempting to read test document...");
      const testDoc = await getDoc(testRef);
      if (testDoc.exists()) {
        console.log("✅ Successfully read test document:", testDoc.data());
      } else {
        console.error("❌ Test document does not exist after write");
        return false;
      }
      
      // Test 4: Test arrayUnion operation
      console.log("🔥 Testing arrayUnion operation...");
      await updateDoc(testRef, {
        messages: arrayUnion({
          agent: 'TestAgent',
          message: 'Test message',
          timestamp: new Date().toISOString()
        }),
        updated_at: serverTimestamp()
      });
      console.log("✅ Successfully performed arrayUnion operation");
      
      // Test 5: Clean up test document
      console.log("🔥 Cleaning up test document...");
      await deleteDoc(testRef);
      console.log("✅ Successfully cleaned up test document");
      
      console.log("🎉 All Firebase tests passed!");
      return true;
      
    } catch (error) {
      console.error("❌ Firebase connection test failed:", error);
      console.error("❌ Error code:", error.code);
      console.error("❌ Error message:", error.message);
      return false;
    }
  }
}

// Export a singleton instance
export const firebaseTranscriptService = new FirebaseTranscriptService();

// Export the class for creating additional instances if needed
export default FirebaseTranscriptService; 