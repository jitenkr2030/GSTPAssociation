import { PAYMENT_SUCCESS, PAYMENT_FAILURE } from '../actions/paymentActions';

const initialState = {
  paymentData: null,
    error: null,
    };

    const paymentReducer = (state = initialState, action) => {
      switch (action.type) {
          case PAYMENT_SUCCESS:
                return {
                        ...state,
                                paymentData: action.payload,
                                        error: null,
                                              };
                                                  case PAYMENT_FAILURE:
                                                        return {
                                                                ...state,
                                                                        error: action.error,
                                                                              };
                                                                                  default:
                                                                                        return state;
                                                                                          }
                                                                                          };

                                                                                          export default paymentReducer;
                                                                                          