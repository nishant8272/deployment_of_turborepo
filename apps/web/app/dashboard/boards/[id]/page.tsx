'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { apiFetch } from '../../../../lib/api';
import { ListComponent } from '../../../../components/boards/List';
import { Plus, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3003';

export default function BoardPage() {
  const { id } = useParams() as { id: string };
  const [board, setBoard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [isSubmittingList, setIsSubmittingList] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchBoard();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id]);

  const setupWebSocket = () => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      // Auth happens automatically via cookies now
      ws.send(JSON.stringify({ type: 'join', boardId: id }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.event === 'joined') {
          console.log('Joined board room successfully');
        } else {
          // Patch state based on event
          setBoard((prev: any) => {
            if (!prev) return prev;
            
            const payload = message.data || {};
            const newBoard = { ...prev };
            
            switch (message.event) {
              case 'list.created':
                if (!newBoard.lists.find((l: any) => l.id === payload.id)) {
                  newBoard.lists = [...newBoard.lists, payload];
                }
                break;
              case 'list.updated':
                newBoard.lists = newBoard.lists.map((l: any) => l.id === payload.id ? { ...l, ...payload } : l);
                break;
              case 'list.deleted':
                newBoard.lists = newBoard.lists.filter((l: any) => l.id !== payload.id);
                break;
              case 'lists.reordered':
                newBoard.lists = payload.items.map((reorderedList: any) => {
                  const existingList = newBoard.lists.find((l: any) => l.id === reorderedList.id);
                  return { ...existingList, position: reorderedList.position };
                }).sort((a: any, b: any) => a.position - b.position);
                break;
              case 'card.created':
                newBoard.lists = newBoard.lists.map((l: any) => {
                  if (l.id === payload.listId) {
                    const cardExists = (l.cards || []).some((c: any) => c.id === payload.id);
                    if (!cardExists) {
                      return { ...l, cards: [...(l.cards || []), payload] };
                    }
                  }
                  return l;
                });
                break;
              case 'card.updated':
                newBoard.lists = newBoard.lists.map((l: any) => ({
                  ...l,
                  cards: (l.cards || []).map((c: any) => c.id === payload.id ? { ...c, ...payload } : c)
                }));
                break;
              case 'card.deleted':
                newBoard.lists = newBoard.lists.map((l: any) => ({
                  ...l,
                  cards: (l.cards || []).filter((c: any) => c.id !== payload.id)
                }));
                break;
              case 'card.moved':
                let movedCard: any = null;
                // Remove from old list
                newBoard.lists = newBoard.lists.map((l: any) => {
                  if (l.id === payload.fromListId) {
                    movedCard = (l.cards || []).find((c: any) => c.id === payload.cardId);
                    return { ...l, cards: (l.cards || []).filter((c: any) => c.id !== payload.cardId) };
                  }
                  return l;
                });
                // Add to new list and update position
                if (movedCard) {
                  movedCard.position = payload.position;
                  newBoard.lists = newBoard.lists.map((l: any) => {
                    if (l.id === payload.toListId) {
                      return { ...l, cards: [...(l.cards || []), movedCard].sort((a: any, b: any) => a.position - b.position) };
                    }
                    return l;
                  });
                }
                break;
              case 'cards.reordered':
                newBoard.lists = newBoard.lists.map((l: any) => {
                  if (l.id === payload.listId) {
                    const newCards = (l.cards || []).map((c: any) => {
                      const reorderedItem = payload.items.find((i: any) => i.id === c.id);
                      return reorderedItem ? { ...c, position: reorderedItem.position } : c;
                    }).sort((a: any, b: any) => a.position - b.position);
                    return { ...l, cards: newCards };
                  }
                  return l;
                });
                break;
            }
            return newBoard;
          });
        }
      } catch (err) {
        console.error('WS Error:', err);
      }
    };
  };

  const fetchBoard = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await apiFetch<any>(`/boards/${id}`);
      setBoard(data);
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsInviting(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      await apiFetch(`/boards/${id}/members`, {
        method: 'POST',
        data: { email: inviteEmail.trim(), role: 'MEMBER' }
      });
      setInviteSuccess('User invited successfully!');
      setInviteEmail('');
      fetchBoard(false); // Refresh board members in the background
      setTimeout(() => {
        setIsInviteModalOpen(false);
        setInviteSuccess('');
      }, 2000);
    } catch (err: any) {
      setInviteError(err.response?.data?.error?.message || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAddList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    setIsSubmittingList(true);
    
    try {
      const newList = await apiFetch<any>(`/boards/${id}/lists`, {
        method: 'POST',
        data: { title: newListTitle }
      });
      
      newList.cards = [];
      setBoard((prev: any) => ({
        ...prev,
        lists: [...prev.lists, newList]
      }));
      setNewListTitle('');
      setIsAddingList(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingList(false);
    }
  };

  const handleCardAdded = (listId: string, card: any) => {
    setBoard((prev: any) => {
      const newLists = prev.lists.map((list: any) => {
        if (list.id === listId) {
          return { ...list, cards: [...(list.cards || []), card] };
        }
        return list;
      });
      return { ...prev, lists: newLists };
    });
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    // 1. Moving a list
    if (type === 'list') {
      const newLists = Array.from(board.lists);
      const [removed] = newLists.splice(source.index, 1);
      newLists.splice(destination.index, 0, removed);
      
      const reorderedLists = newLists.map((list: any, index) => ({
        ...list,
        position: index * 1000
      }));
      
      setBoard((prev: any) => ({ ...prev, lists: reorderedLists }));

      try {
        await apiFetch(`/boards/${id}/lists/reorder`, {
          method: 'PATCH',
          data: {
            items: reorderedLists.map(l => ({ id: l.id, position: l.position }))
          }
        });
      } catch (err) {
        console.error('Failed to reorder lists', err);
        fetchBoard();
      }
      return;
    }

    // 2. Moving a card
    if (type === 'card') {
      const sourceList = board.lists.find((l: any) => l.id === source.droppableId);
      const destList = board.lists.find((l: any) => l.id === destination.droppableId);

      if (!sourceList || !destList) return;

      if (source.droppableId === destination.droppableId) {
        // Same list reorder
        const newCards = Array.from(sourceList.cards);
        const [removed] = newCards.splice(source.index, 1);
        newCards.splice(destination.index, 0, removed);

        const reorderedCards = newCards.map((c: any, index) => ({
          ...c,
          position: index * 1000
        }));

        setBoard((prev: any) => ({
          ...prev,
          lists: prev.lists.map((l: any) => l.id === sourceList.id ? { ...l, cards: reorderedCards } : l)
        }));

        try {
          await apiFetch(`/lists/${sourceList.id}/cards/reorder`, {
            method: 'PATCH',
            data: {
              items: reorderedCards.map((c: any) => ({ id: c.id, position: c.position }))
            }
          });
        } catch (err) {
          fetchBoard();
        }
      } else {
        // Moving to a different list
        const sourceCards = Array.from(sourceList.cards);
        const [movedCard] = sourceCards.splice(source.index, 1);
        
        const destCards = Array.from(destList.cards);
        destCards.splice(destination.index, 0, movedCard);

        const reorderedDestCards = destCards.map((c: any, index) => ({
          ...c,
          position: index * 1000
        }));

        setBoard((prev: any) => ({
          ...prev,
          lists: prev.lists.map((l: any) => {
            if (l.id === sourceList.id) return { ...l, cards: sourceCards };
            if (l.id === destList.id) return { ...l, cards: reorderedDestCards };
            return l;
          })
        }));

        try {
          await apiFetch(`/cards/${draggableId}/move`, {
            method: 'PATCH',
            data: {
              toListId: destList.id,
              position: destination.index * 1000
            }
          });
          
          await apiFetch(`/lists/${destList.id}/cards/reorder`, {
            method: 'PATCH',
            data: {
              items: reorderedDestCards.map((c: any) => ({ id: c.id, position: c.position }))
            }
          });
        } catch (err) {
          fetchBoard();
        }
      }
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading board...</div>;
  if (!board) return <div style={{ padding: '2rem' }}>Board not found.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Board Header */}
      <div style={{ 
        padding: '1rem 2rem', 
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        backgroundColor: 'var(--bg-secondary)',
      }}>
        <Link href="/dashboard" style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{board.title}</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {board.members?.length} member(s)
          </span>
          <button 
            onClick={() => setIsInviteModalOpen(true)}
            className="btn-primary" 
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
          >
            Invite
          </button>
        </div>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-secondary)', padding: '2rem',
            borderRadius: '12px', minWidth: '350px',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Invite to Board</h2>
            
            {inviteError && <div style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '0.9rem' }}>{inviteError}</div>}
            {inviteSuccess && <div style={{ color: '#22c55e', marginBottom: '1rem', fontSize: '0.9rem' }}>{inviteSuccess}</div>}
            
            <form onSubmit={handleInviteMember}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>User Email</label>
                <input
                  type="email"
                  className="input-field"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="friend@example.com"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => { setIsInviteModalOpen(false); setInviteError(''); setInviteSuccess(''); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isInviting}>
                  {isInviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kanban Board Area */}
      <div style={{ flex: 1, padding: '1.5rem', overflowX: 'auto', overflowY: 'hidden' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="all-lists" direction="horizontal" type="list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{ display: 'flex', alignItems: 'flex-start', height: '100%' }}
              >
                {board.lists.map((list: any, index: number) => (
                  <ListComponent key={list.id} list={list} index={index} onCardAdded={handleCardAdded} />
                ))}
                {provided.placeholder}

                {/* Add List Button */}
                <div style={{ minWidth: '280px', width: '280px', marginLeft: board.lists.length > 0 ? '0' : '0' }}>
                  {isAddingList ? (
                    <form onSubmit={handleAddList} style={{ backgroundColor: 'var(--bg-secondary)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                      <input
                        type="text"
                        className="input-field"
                        value={newListTitle}
                        onChange={(e) => setNewListTitle(e.target.value)}
                        placeholder="Enter list title..."
                        autoFocus
                        required
                        style={{ marginBottom: '0.5rem' }}
                      />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn-primary" disabled={isSubmittingList}>Add List</button>
                        <button type="button" className="btn-secondary" onClick={() => setIsAddingList(false)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setIsAddingList(true)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '1rem',
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: 'var(--text-primary)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                    >
                      <Plus size={16} /> Add another list
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
