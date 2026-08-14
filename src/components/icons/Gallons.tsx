import React from 'react';

export const SlimGallonIcon = ({ className = "w-24 h-24" }: { className?: string }) => (
  <img 
    src="/slim-gallon.jpg" 
    alt="Slim Gallon" 
    className={`${className} object-contain mix-blend-multiply rounded-md`} 
    style={{ mixBlendMode: 'multiply' }} 
  />
);

export const RoundGallonIcon = ({ className = "w-24 h-24" }: { className?: string }) => (
  <img 
    src="/round-gallon.jpg" 
    alt="Round Gallon" 
    className={`${className} object-contain mix-blend-multiply rounded-md`} 
    style={{ mixBlendMode: 'multiply' }} 
  />
);

