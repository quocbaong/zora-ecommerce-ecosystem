require('dotenv').config({ path: '../.env' });
const reportService = require('./src/services/reportService');

const { client, docClient } = require('./src/config/dynamodb');

const run = async () => {
  try {
    const conversationId = "f33dbbc8-7821-4d37-83c3-3e270cbf2d70"; 
    
    // Look up the conversation using Scan because we don't know the partition key
    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const res = await docClient.send(new ScanCommand({ 
      TableName: "chat_conversations",
      FilterExpression: "conversationId = :cid",
      ExpressionAttributeValues: { ":cid": conversationId }
    }));
    
    if (!res.Items || res.Items.length === 0) {
      console.log("Conversation not found!");
      return;
    }
    const conv = res.Items[0];
    console.log("Found conversation:", conv);
    
    const result = await reportService.submitReport({
      conversationId: conv.conversationId,
      reporterId: conv.userId,
      reason: "SPAM",
      description: "Test description",
      evidenceMessageIds: []
    });
    console.log("Report submitted successfully:", result);
  } catch (err) {
    console.error("Error submitting report:", err.stack);
  }
};

run();
