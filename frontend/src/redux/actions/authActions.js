import { login, register, logout } from '../../services/auth';

export const LOGIN_SUCCESS = 'LOGIN_SUCCESS';
export const LOGIN_FAILURE = 'LOGIN_FAILURE';
export const LOGOUT_SUCCESS = 'LOGOUT_SUCCESS';

export const loginUser = (credentials) => async (dispatch) => {
  try {
      const user = await login(credentials);
          dispatch({ type: LOGIN_SUCCESS, payload: user });
            } catch (error) {
                dispatch({ type: LOGIN_FAILURE, error: error.message });
                  }
                  };

                  export const registerUser = (details) => async (dispatch) => {
                    try {
                        const user = await register(details);
                            dispatch({ type: LOGIN_SUCCESS, payload: user });
                              } catch (error) {
                                  dispatch({ type: LOGIN_FAILURE, error: error.message });
                                    }
                                    };

                                    export const logoutUser = () => (dispatch) => {
                                      logout();
                                        dispatch({ type: LOGOUT_SUCCESS });
                                        };
                                        