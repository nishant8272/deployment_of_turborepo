import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { CardComponent } from './Card';
import { Plus } from 'lucide-react';
import { apiFetch } from '../../lib/api';

interface ListProps {
  list: any;
  index: number;
  onCardAdded: (listId: string, card: any) => void;
}

export const ListComponent: React.FC<ListProps> = ({ list, index, onCardAdded }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const newCard = await apiFetch<any>(`/lists/${list.id}/cards`, {
        method: 'POST',
        data: { title: newCardTitle },
      });
      onCardAdded(list.id, newCard);
      setNewCardTitle('');
      setIsAdding(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Draggable draggableId={list.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            width: '280px',
            minWidth: '280px',
            marginRight: '1rem',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '100%',
            opacity: snapshot.isDragging ? 0.8 : 1,
          }}
        >
          {/* List Header */}
          <div
            {...provided.dragHandleProps}
            style={{
              padding: '1rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'grab',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            {list.title}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{list.cards?.length || 0}</span>
          </div>

          {/* Cards Droppable Area */}
          <Droppable droppableId={list.id} type="card">
            {(droppableProvided, droppableSnapshot) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                style={{
                  padding: '0 0.5rem',
                  flexGrow: 1,
                  overflowY: 'auto',
                  minHeight: '10px',
                  backgroundColor: droppableSnapshot.isDraggingOver ? 'rgba(88,166,255,0.05)' : 'transparent',
                  transition: 'background-color 0.2s',
                }}
              >
                {list.cards?.map((card: any, idx: number) => (
                  <CardComponent key={card.id} card={card} index={idx} />
                ))}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Add Card Footer */}
          <div style={{ padding: '0.5rem' }}>
            {isAdding ? (
              <form onSubmit={handleAddCard} style={{ backgroundColor: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--accent-primary)' }}>
                <textarea
                  value={newCardTitle}
                  onChange={(e) => setNewCardTitle(e.target.value)}
                  placeholder="Enter a title for this card..."
                  style={{
                    width: '100%',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    fontSize: '0.9rem',
                    marginBottom: '0.5rem'
                  }}
                  autoFocus
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddCard(e);
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} disabled={isSubmitting}>
                    {isSubmitting ? '...' : 'Add Card'}
                  </button>
                  <button type="button" className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', border: 'none', backgroundColor: 'transparent' }} onClick={() => setIsAdding(false)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAdding(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <Plus size={16} /> Add a card
              </button>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
};
