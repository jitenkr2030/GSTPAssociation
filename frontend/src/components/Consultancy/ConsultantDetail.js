import React, { useEffect, useState } from 'react';
import { getConsultant } from '../../services/api';
import { useParams } from 'react-router-dom';

const ConsultantDetail = () => {
  const { id } = useParams();
    const [consultant, setConsultant] = useState(null);

      useEffect(() => {
          const fetchConsultant = async () => {
                const data = await getConsultant(id);
                      setConsultant(data);
                          };
                              fetchConsultant();
                                }, [id]);

                                  if (!consultant) return <div>Loading...</div>;

                                    return (
                                        <div>
                                              <h1>{consultant.name}</h1>
                                                    <p>{consultant.expertise}</p>
                                                          {/* Add booking button, contact info, etc. */}
                                                              </div>
                                                                );
                                                                };

                                                                export default ConsultantDetail;
                                                                