import React, { useEffect, useState } from 'react';
import { getConsultants } from '../../services/api';
import { Link } from 'react-router-dom';

const ConsultancyList = () => {
  const [consultants, setConsultants] = useState([]);

    useEffect(() => {
        const fetchConsultants = async () => {
              const data = await getConsultants();
                    setConsultants(data);
                        };
                            fetchConsultants();
                              }, []);

                                return (
                                    <div>
                                          <h1>Consultants</h1>
                                                <ul>
                                                        {consultants.map((consultant) => (
                                                                  <li key={consultant.id}>
                                                                              <Link to={`/consultancy/${consultant.id}`}>{consultant.name}</Link>
                                                                                        </li>
                                                                                                ))}
                                                                                                      </ul>
                                                                                                          </div>
                                                                                                            );
                                                                                                            };

                                                                                                            export default ConsultancyList;
                                                                                                            