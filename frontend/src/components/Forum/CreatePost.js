import React, { useState } from 'react';
import { createPost } from '../../services/api';
import { useHistory } from 'react-router-dom';

const CreatePost = () => {
  const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
      const history = useHistory();

        const handleSubmit = async (e) => {
            e.preventDefault();
                try {
                      await createPost({ title, content });
                            history.push('/forum');
                                } catch (error) {
                                      console.error(error);
                                          }
                                            };

                                              return (
                                                  <form onSubmit={handleSubmit}>
                                                        <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                                                              <textarea placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} required />
                                                                    <button type="submit">Create Post</button>
                                                                        </form>
                                                                          );
                                                                          };

                                                                          export default CreatePost;
                                                                          