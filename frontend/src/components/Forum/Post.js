import React, { useEffect, useState } from 'react';
import { getPost } from '../../services/api';
import { useParams } from 'react-router-dom';

const Post = () => {
  const { id } = useParams();
    const [post, setPost] = useState(null);

      useEffect(() => {
          const fetchPost = async () => {
                const data = await getPost(id);
                      setPost(data);
                          };
                              fetchPost();
                                }, [id]);

                                  if (!post) return <div>Loading...</div>;

                                    return (
                                        <div>
                                              <h1>{post.title}</h1>
                                                    <p>{post.content}</p>
                                                          {/* Add comments, like button, etc. */}
                                                              </div>
                                                                );
                                                                };

                                                                export default Post;
                                                                