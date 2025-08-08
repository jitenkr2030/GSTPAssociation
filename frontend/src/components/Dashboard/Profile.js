import React, { useState } from 'react';
import { updateProfile } from '../../services/api';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '../../redux/actions/userActions';

const Profile = () => {
  const user = useSelector((state) => state.user);
    const dispatch = useDispatch();
      const [name, setName] = useState(user.name);

        const handleUpdate = async () => {
            try {
                  const updatedUser = await updateProfile({ name });
                        dispatch(setUser(updatedUser));
                              alert('Profile updated successfully.');
                                  } catch (error) {
                                        console.error(error);
                                            }
                                              };

                                                return (
                                                    <div>
                                                          <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                                                                <button onClick={handleUpdate}>Update Profile</button>
                                                                    </div>
                                                                      );
                                                                      };

                                                                      export default Profile;
                                                                      