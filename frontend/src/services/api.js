import axios from 'axios';

export const submitReturnFiling = async (data) => {
  const response = await axios.post('/api/return-filing', data);
    return response.data;
    };

    export const submitAuditReport = async (file) => {
      const formData = new FormData();
        formData.append('file', file);
          const response = await axios.post('/api/audit-compliance', formData);
            return response.data;
            };

            export const getComplianceStatus = async () => {
              const response = await axios.get('/api/compliance-status');
                return response.data;
                };

                export const makePayment = async (data) => {
                  const response = await axios.post('/api/payment', data);
                    return response.data;
                    };

                    export const getAnalyticsData = async () => {
                      const response = await axios.get('/api/analytics');
                        return response.data;
                        };
                        