export const formatCurrency = (amount) => {
      return new Intl.NumberFormat('en-IN', {
          style: 'currency',
              currency: 'INR',
                }).format(amount);
                };

                export const formatDate = (date) => {
                  return new Intl.DateTimeFormat('en-IN', {
                      year: 'numeric',
                          month: 'long',
                              day: 'numeric',
                                }).format(new Date(date));
                                };

