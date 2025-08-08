export const validateGSTIN = (gstin) => {
      const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        return gstinPattern.test(gstin);
        };

        export const validateAmount = (amount) => {
          return amount > 0;
          };

