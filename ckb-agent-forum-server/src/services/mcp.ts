/**
 * CKB AI MCP Integration Service
 * Interfaces with CKB AI MCP Server for enhanced capabilities
 */

import axios from 'axios';

const MCP_SERVER_URL = process.env.CKB_MCP_URL || 'https://mcp.ckbdev.com/ckbai';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

export class MCPService {
  private static initialized = false;
  private static serverInfo: any = null;

  /**
   * Initialize MCP connection via SSE
   */
  static async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    
    try {
      // MCP uses SSE, we need to initialize first
      const response = await axios.post(MCP_SERVER_URL, {
        jsonrpc: '2.0',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'ckb-agent-forum',
            version: '1.0.0'
          }
        },
        id: 0
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        responseType: 'stream'
      });

      // Parse SSE response
      let data = '';
      for await (const chunk of response.data) {
        data += chunk.toString();
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.result?.serverInfo) {
                this.serverInfo = parsed.result.serverInfo;
                this.initialized = true;
                console.log('✅ MCP initialized:', this.serverInfo);
                return true;
              }
            } catch {}
          }
        }
      }
      
      return false;
    } catch (error: any) {
      console.error('MCP initialize error:', error.message);
      return false;
    }
  }

  /**
   * List available MCP tools - simplified, return common tools
   */
  static async listTools(): Promise<MCPTool[]> {
    // Return known tools from CKB AI MCP
    return [
      { name: 'get_blockchain_info', description: 'Get CKB blockchain information', inputSchema: { type: 'object', properties: {} } },
      { name: 'get_block', description: 'Get block by number', inputSchema: { type: 'object', properties: { block_number: { type: 'number' } } } },
      { name: 'get_transaction', description: 'Get transaction by hash', inputSchema: { type: 'object', properties: { tx_hash: { type: 'string' } } } },
      { name: 'get_balance', description: 'Get address balance', inputSchema: { type: 'object', properties: { address: { type: 'string' } } } },
      { name: 'search_tools', description: 'Search for tools', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } },
      { name: 'deploy_contract', description: 'Deploy a smart contract', inputSchema: { type: 'object', properties: { code: { type: 'string' } } } },
    ];
  }

  /**
   * Call a specific MCP tool
   */
  static async callTool(toolName: string, args: Record<string, any>): Promise<MCPToolResult | null> {
    if (!await this.initialize()) return null;
    
    try {
      const response = await axios.post(MCP_SERVER_URL, {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        },
        id: Date.now()
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream'
        },
        responseType: 'stream'
      });

      let data = '';
      for await (const chunk of response.data) {
        data += chunk.toString();
        const lines = data.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.result) {
                return parsed.result;
              }
              if (parsed.error) {
                console.error('MCP error:', parsed.error);
                return null;
              }
            } catch {}
          }
        }
      }
      
      return null;
    } catch (error: any) {
      console.error(`MCP callTool(${toolName}) error:`, error.message);
      return null;
    }
  }

  // ========== High-level APIs ==========

  /**
   * Get CKB blockchain info via MCP
   */
  static async getBlockchainInfo(): Promise<any> {
    const result = await this.callTool('get_blockchain_info', {});
    if (result && result.content?.[0]) {
      try {
        return JSON.parse(result.content[0].text);
      } catch {
        return result.content[0].text;
      }
    }
    return null;
  }

  /**
   * Get balance for an address
   */
  static async getBalance(address: string): Promise<string> {
    const result = await this.callTool('get_balance', { address });
    if (result && result.content?.[0]) {
      try {
        const data = JSON.parse(result.content[0].text);
        return data.balance || '0';
      } catch {
        return result.content[0].text;
      }
    }
    return '0';
  }

  /**
   * Get transaction status
   */
  static async getTransaction(txHash: string): Promise<any> {
    const result = await this.callTool('get_transaction', { tx_hash: txHash });
    if (result && result.content?.[0]) {
      try {
        return JSON.parse(result.content[0].text);
      } catch {
        return result.content[0].text;
      }
    }
    return null;
  }

  /**
   * Get block by number
   */
  static async getBlock(blockNumber: number): Promise<any> {
    const result = await this.callTool('get_block', { block_number: blockNumber });
    if (result && result.content?.[0]) {
      try {
        return JSON.parse(result.content[0].text);
      } catch {
        return result.content[0].text;
      }
    }
    return null;
  }

  /**
   * Request faucet tokens (mock - real implementation needs proper auth)
   */
  static async requestFaucet(address: string): Promise<{ success: boolean; txHash?: string; message?: string }> {
    // Note: Real faucet requires special setup
    return { success: false, message: 'Faucet requires local MCP server with faucet配置' };
  }

  /**
   * Deploy a cell (placeholder)
   */
  static async deployCell(lockScript: any): Promise<{ success: boolean; txHash?: string; message?: string }> {
    return { success: false, message: 'Deploy requires local MCP server' };
  }

  /**
   * Validate a transaction
   */
  static async validateTransaction(tx: any): Promise<{ valid: boolean; message?: string }> {
    return { valid: false, message: 'Validate requires local MCP server' };
  }

  /**
   * Test MCP connection
   */
  static async testConnection(): Promise<boolean> {
    return await this.initialize();
  }

  /**
   * Get server info
   */
  static getServerInfo() {
    return this.serverInfo;
  }
}
