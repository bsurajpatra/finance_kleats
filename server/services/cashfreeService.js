import fetch from 'node-fetch';

class CashfreeService {
  constructor() {
    this.baseURL = process.env.CASHFREE_BASE_URL;
    this.clientId = process.env.CASHFREE_CLIENT_ID;
    this.clientSecret = process.env.CASHFREE_CLIENT_SECRET;
    this.apiVersion = '2025-01-01';
  }

  async fetchSettlements(filters = {}, pagination = {}) {
    try {
      const url = `${this.baseURL}/pg/settlements`;
      
      const requestBody = {
        pagination: {
          limit: pagination.limit || 50,
          ...(pagination.cursor && { cursor: pagination.cursor })
        },
        filters: {
          ...(filters.start_date && { start_date: filters.start_date }),
          ...(filters.end_date && { end_date: filters.end_date }),
          ...(filters.cf_settlement_ids && { cf_settlement_ids: filters.cf_settlement_ids }),
          ...(filters.settlement_utrs && { settlement_utrs: filters.settlement_utrs })
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': this.apiVersion,
          'x-client-id': this.clientId,
          'x-client-secret': this.clientSecret
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Cashfree API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Cashfree settlements:', error);
      throw error;
    }
  }

  async fetchAllSettlements(filters = {}) {
    const allSettlements = [];
    let cursor = null;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.fetchSettlements(filters, { 
          limit: 50, 
          cursor 
        });

        if (response.data && Array.isArray(response.data)) {
          allSettlements.push(...response.data);
        }

        // Check if there's more data
        cursor = response.pagination?.cursor;
        hasMore = !!cursor;

        // Safety check to prevent infinite loops
        if (allSettlements.length > 10000) {
          console.warn('Fetched more than 10,000 settlements, stopping pagination');
          break;
        }
      } catch (error) {
        console.error('Error in pagination:', error);
        break;
      }
    }

    return allSettlements;
  }

  async getSettlementsByDateRange(startDate, endDate) {
    const filters = {
      start_date: startDate,
      end_date: endDate
    };
    
    return await this.fetchAllSettlements(filters);
  }
}

export default new CashfreeService();
