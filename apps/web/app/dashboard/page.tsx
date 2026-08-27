'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import Link from 'next/link';

interface Board {
  id: string;
  title: string;
  description: string | null;
}

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const fetchBoards = async () => {
    try {
      const data = await apiFetch<Board[]>('/boards');
      setBoards(data);
    } catch (error) {
      console.error('Failed to fetch boards:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsCreating(true);

    try {
      const newBoard = await apiFetch<Board>('/boards', {
        method: 'POST',
        data: { title: newTitle, description: newDescription || undefined },
      });
      setBoards([newBoard, ...boards]);
      setIsModalOpen(false);
      setNewTitle('');
      setNewDescription('');
    } catch (err: any) {
      setError(err.message || 'Failed to create board');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '2rem' }}>Loading boards...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Your Boards</h1>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Plus size={16} /> Create Board
        </button>
      </div>

      {boards.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You don't have any boards yet.</p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>Create your first board</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {boards.map((board) => (
            <Link href={`/dashboard/boards/${board.id}`} key={board.id}>
              <motion.div
                whileHover={{ y: -4, boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  height: '140px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{board.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {board.description || 'No description'}
                </p>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-panel"
            style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: 'var(--bg-secondary)' }}
          >
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Create Board</h2>
            
            {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
            
            <form onSubmit={handleCreateBoard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label className="label">Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={newTitle} 
                  onChange={(e) => setNewTitle(e.target.value)} 
                  required 
                  placeholder="e.g. Q4 Marketing Plan"
                />
              </div>
              
              <div>
                <label className="label">Description (Optional)</label>
                <textarea 
                  className="input-field" 
                  value={newDescription} 
                  onChange={(e) => setNewDescription(e.target.value)} 
                  placeholder="What is this board about?"
                  rows={3}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isCreating}>
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
