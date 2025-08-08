import { LOGIN_SUCCESS, LOGIN_FAILURE, LOGOUT_SUCCESS } from '../actions/authActions';

const initialState = {
  user: null,
    isAuthenticated: false,
      error: null,
      };

      const authReducer = (state = initialState, action) => {
        switch (action.type) {
            case LOGIN_SUCCESS:
                  return {
                          ...state,
                                  user: action.payload,
                                          isAuthenticated: true,
                                                  error: null,
                                                        };
                                                            case LOGIN_FAILURE:
                                                                  return {
                                                                          ...state,
                                                                                  error: action.error,
                                                                                        };
                                                                                            case LOGOUT_SUCCESS:
                                                                                                  return initialState;
                                                                                                      default:
                                                                                                            return state;
                                                                                                              }
                                                                                                              };

                                                                                                              export default authReducer;
                                                                                                              