import React, { useEffect, useState } from 'react';
import { getEvents } from '../../services/api';
import { Link } from 'react-router-dom';

const EventList = () => {
  const [events, setEvents] = useState([]);

    useEffect(() => {
        const fetchEvents = async () => {
              const data = await getEvents();
                    setEvents(data);
                        };
                            fetchEvents();
                              }, []);

                                return (
                                    <div>
                                          <h1>Upcoming Events</h1>
                                                <ul>
                                                        {events.map((event) => (
                                                                  <li key={event.id}>
                                                                              <Link to={`/events/${event.id}`}>{event.name}</Link>
                                                                                        </li>
                                                                                                ))}
                                                                                                      </ul>
                                                                                                          </div>
                                                                                                            );
                                                                                                            };

                                                                                                            export default EventList;
                                                                                                            