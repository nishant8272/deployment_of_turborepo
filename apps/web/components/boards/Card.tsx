import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Draggable } from '@hello-pangea/dnd';

interface CardProps {
  card: any;
  index: number;
}

export const CardComponent: React.FC<CardProps> = ({ card, index }) => {
  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            marginBottom: '0.5rem',
          }}
        >
          <motion.div
            whileHover={{ y: -2 }}
            style={{
              backgroundColor: snapshot.isDragging ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
              padding: '0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              boxShadow: snapshot.isDragging ? '0 10px 20px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.1)',
              cursor: 'grab',
              userSelect: 'none',
              transition: 'background-color 0.2s',
            }}
          >
            <h4 style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: card.description ? '0.25rem' : 0 }}>
              {card.title}
            </h4>
            {card.description && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {card.description.length > 50 ? `${card.description.substring(0, 50)}...` : card.description}
              </p>
            )}
            {card.comments && card.comments.length > 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                💬 {card.comments.length}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </Draggable>
  );
};
