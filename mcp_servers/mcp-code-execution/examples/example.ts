/**
 * Example usage of generated MCP tool files
 * 
 * This demonstrates how to use the generated TypeScript files
 * to interact with MCP servers in a code execution environment.
 */

import { initializeMCPServers } from '../servers/client.js';
import * as gdrive from '../servers/google_drive/index.js';
import * as salesforce from '../servers/salesforce/index.js';

// Initialize MCP servers with their configurations
// In a real implementation, these would come from Claude Desktop config
async function setup() {
  await initializeMCPServers({
    google_drive: {
      command: 'node',
      args: ['path/to/gdrive-server.js'],
      env: {
        API_KEY: 'your-api-key'
      }
    },
    salesforce: {
      command: 'node',
      args: ['path/to/salesforce-server.js'],
      env: {
        SALESFORCE_TOKEN: 'your-token'
      }
    }
  });
}

/**
 * Example 1: Read document from Google Drive and update Salesforce
 */
async function example1() {
  await setup();

  // Read transcript from Google Docs
  const transcript = await gdrive.getDocument({ 
    documentId: 'abc123' 
  });

  // Update Salesforce record with the transcript
  await salesforce.updateRecord({
    objectType: 'SalesMeeting',
    recordId: '00Q5f000001abcXYZ',
    data: { 
      Notes: transcript.content 
    }
  });
}

/**
 * Example 2: Filter large dataset before returning
 */
async function example2() {
  await setup();

  // Fetch all rows from a spreadsheet
  const allRows = await gdrive.getSheet({ 
    sheetId: 'abc123' 
  });

  // Filter in code execution environment (not in model context)
  const pendingOrders = allRows.filter(row => 
    row["Status"] === 'pending'
  );

  // Only log summary and first few rows
  console.log(`Found ${pendingOrders.length} pending orders`);
  console.log(pendingOrders.slice(0, 5)); // Only first 5 rows
}

/**
 * Example 3: Loop with conditional logic
 */
async function example3() {
  await setup();

  // Wait for deployment notification in Slack
  let found = false;
  while (!found) {
    const messages = await gdrive.getChannelHistory({ 
      channel: 'C123456' 
    });
    
    found = messages.some(m => 
      m.text.includes('deployment complete')
    );
    
    if (!found) {
      await new Promise(r => setTimeout(r, 5000)); // Wait 5 seconds
    }
  }
  
  console.log('Deployment notification received');
}

/**
 * Example 4: Process sensitive data without exposing to model
 */
async function example4() {
  await setup();

  // Import customer contacts from spreadsheet to Salesforce
  const sheet = await gdrive.getSheet({ 
    sheetId: 'abc123' 
  });

  // Process in code execution environment
  // Sensitive data (emails, phones) never enters model context
  for (const row of sheet.rows) {
    await salesforce.updateRecord({
      objectType: 'Lead',
      recordId: row.salesforceId,
      data: { 
        Email: row.email,      // PII stays in execution environment
        Phone: row.phone,       // PII stays in execution environment
        Name: row.name         // PII stays in execution environment
      }
    });
  }

  // Only log summary
  console.log(`Updated ${sheet.rows.length} leads`);
}

/**
 * Example 5: Save state to filesystem
 */
async function example5() {
  await setup();
  const fs = await import('fs/promises');

  // Query leads from Salesforce
  const leads = await salesforce.query({ 
    query: 'SELECT Id, Email FROM Lead LIMIT 1000' 
  });

  // Save to CSV file
  const csvData = leads.map(l => 
    `${l.Id},${l.Email}`
  ).join('\n');
  
  await fs.writeFile('./workspace/leads.csv', csvData);

  // Later, resume from saved file
  const saved = await fs.readFile('./workspace/leads.csv', 'utf-8');
  const savedLeads = saved.split('\n').map(line => {
    const [id, email] = line.split(',');
    return { id, email };
  });
}
