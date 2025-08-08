import React, { useEffect, useState } from 'react';
import { getEvent } from '../../services/api';
import { useParams } from 'react-router-dom';

const EventDetail = () => {
  const { id } = useParams();
    const [event, setEvent] = useState(null);

      useEffect(() => {
          const fetchEvent = async () => {
                const data = await getEvent(id);
                      setEvent(data);
                          };
                              fetchEvent();
                                }, [id]);

                                  if (!event) return <div>Loading...</div>;

                                    return (
                                        <div>
                                              <h1>{event.name}</h1>
                                                    <p>{event.description}</p>
                                                          {/* Add registration link, calendar integration, etc. */}
                                                              </div>
                                                                );
                                                                };

                                                                export default EventDetail;
                                                                