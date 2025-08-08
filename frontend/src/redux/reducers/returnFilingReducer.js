import { SUBMIT_RETURN_SUCCESS, SUBMIT_RETURN_FAILURE } from '../actions/returnFilingActions';

const initialState = {
  returnData: null,
    error: null,
    };

    const returnFilingReducer = (state = initialState, action) => {
      switch (action.type) {
          case SUBMIT_RETURN_SUCCESS:
                return {
                        ...state,
                                returnData: action.payload,
                                        error: null,
                                              };
                                                  case SUBMIT_RETURN_FAILURE:
                                                        return {
                                                                ...state,
                                                                        error: action.error,
                                                                              };
                                                                                  default:
                                                                                        return state;
                                                                                          }
                                                                                          };

                                                                                          export default returnFilingReducer;
                                                                                          