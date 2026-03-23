/**
 * CKB Service - Interacts with CKB Blockchain
 */

import axios from 'axios';

const CKB_RPC_URL = process.env.CKB_RPC_URL || 'https://testnet.ckb.dev';
const CKB_INDEXER_URL = process.env.CKB_INDEXER_URL || 'https://testnet.ckb.dev/indexer';

interface BlockchainInfo {
  chain: string;
  numBlocks: number;
  numTransactions: number;
  epoch: number;
  difficulty: string;
}

interface Cell {
  data: string;
  dataHash: string;
  lock: any;
  type: any | null;
  outPoint: {
    txHash: string;
    index: string;
  };
}

interface TransactionWithStatus {
  transaction: any;
  txStatus: {
    blockHash: string | null;
    status: string;
  };
}

export class CKBService {
  private static rpcClient = axios.create({
    baseURL: CKB_RPC_URL,
    headers: { 'Content-Type': 'application/json' }
  });

  private static indexerClient = axios.create({
    baseURL: CKB_INDEXER_URL,
    headers: { 'Content-Type': 'application/json' }
  });

  private static connected: boolean = false;

  /**
   * Test connection to CKB node
   */
  static async testConnection(): Promise<boolean> {
    try {
      const response = await this.rpcClient.post('', {
        jsonrpc: '2.0',
        method: 'get_blockchain_info',
        params: [],
        id: 1
      });
      this.connected = response.data.result !== null;
      return this.connected;
    } catch (error) {
      console.error('CKB connection test failed:', error);
      this.connected = false;
      return false;
    }
  }

  /**
   * Check if connected to CKB
   */
  static isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get blockchain info
   */
  static async getBlockchainInfo(): Promise<BlockchainInfo> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'get_blockchain_info',
      params: [],
      id: 1
    });
    const result = response.data.result;
    return {
      chain: result.chain,
      numBlocks: parseInt(result.numBlocks, 16),
      numTransactions: parseInt(result.numTransactions, 16),
      epoch: parseInt(result.epoch.epochNumber, 16),
      difficulty: result.difficulty
    };
  }

  /**
   * Get block by number
   */
  static async getBlock(blockNumber: number): Promise<any> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'get_block',
      params: [`0x${blockNumber.toString(16)}`],
      id: 1
    });
    return response.data.result;
  }

  /**
   * Get current tip block number
   */
  static async getTipBlockNumber(): Promise<number> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'get_tip_block_number',
      params: [],
      id: 1
    });
    return parseInt(response.data.result, 16);
  }

  /**
   * Get transaction
   */
  static async getTransaction(txHash: string): Promise<TransactionWithStatus | null> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'get_transaction',
      params: [txHash],
      id: 1
    });
    return response.data.result;
  }

  /**
   * Get live cells by lock script
   */
  static async getCellsByLockScript(lockScript: any, limit: number = 100): Promise<Cell[]> {
    const response = await this.indexerClient.post('', {
      jsonrpc: '2.0',
      method: 'get_cells',
      params: [
        {
          lock: lockScript
        },
        'asc',
        `0x${limit.toString(16)}`
      ],
      id: 1
    });
    return response.data.result.objects || [];
  }

  /**
   * Get balance for an address
   */
  static async getBalance(address: string): Promise<string> {
    // Get cells with the address's lock script
    const lockScript = this.addressToScript(address);
    const cells = await this.getCellsByLockScript(lockScript, 1000);
    
    let balance = 0n;
    for (const cell of cells) {
      if (cell.data === '0x' || cell.data === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        // This is a capacity cell
        const capacity = BigInt(cell.outPoint.index);
        balance += capacity;
      }
    }
    
    return balance.toString();
  }

  /**
   * Convert address to lock script
   */
  static addressToScript(address: string): any {
    // Parse CKB address (simplified - full implementation would use @ckb-js/kuai)
    // This is a mock implementation
    return {
      code_hash: '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a863007177e3f2a4c3b3',
      hash_type: 'type',
      args: address.replace(/^ckt1/, '').slice(0, 40)
    };
  }

  /**
   * Send a transaction
   */
  static async sendTransaction(tx: any): Promise<string> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'send_transaction',
      params: [tx],
      id: 1
    });
    return response.data.result;
  }

  /**
   * Get live cells by type script
   */
  static async getCellsByTypeScript(typeScript: any, limit: number = 100): Promise<Cell[]> {
    const response = await this.indexerClient.post('', {
      jsonrpc: '2.0',
      method: 'get_cells',
      params: [
        {
          type: typeScript
        },
        'asc',
        `0x${limit.toString(16)}`
      ],
      id: 1
    });
    return response.data.result.objects || [];
  }

  /**
   * Estimate fee
   */
  static async estimateFee(tx: any): Promise<string> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'estimate_fee_rate',
      params: [],
      id: 1
    });
    return response.data.result;
  }
}
