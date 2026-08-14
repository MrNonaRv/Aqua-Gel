import React from 'react';
import slimGallon from '../../assets/slim-gallon.jpg';
import roundGallon from '../../assets/round-gallon.jpg';

export const SlimGallonIcon = ({ className = "w-24 h-24" }: { className?: string }) => (
  <img 
    src={slimGallon} 
    alt="Slim Gallon" 
    className={`${className} object-contain mix-blend-multiply rounded-md`} 
    style={{ mixBlendMode: 'multiply' }} 
  />
);

export const RoundGallonIcon = ({ className = "w-24 h-24" }: { className?: string }) => (
  <img 
    src={roundGallon} 
    alt="Round Gallon" 
    className={`${className} object-contain mix-blend-multiply rounded-md`} 
    style={{ mixBlendMode: 'multiply' }} 
  />
);

