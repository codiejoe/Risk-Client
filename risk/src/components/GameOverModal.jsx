import React from 'react';
import Fireworks from '@fireworks-js/react';
import styles from './styles/GameOverModal.module.css';

export default function GameOverModal({ show, message, isWinner, onClose }) {
	if (!show) return null;

	// Opcions per defecte, pots ajustar velocitat, colors, etc.
	// Com podreu observar realment aquests fireworks més m'agradaría haber-los fet a mi, els he tret d'una llibreria: https://blog.openreplay.com/adding-fireworks-effects-to-your-react-app/
	const options = {
		speed: 2,
		acceleration: 1.05,
		friction: 0.98,
		gravity: 1.5,
		particles: 50,
		trace: 3,
		explosion: 5,
		hue: { min: 0, max: 360 },
		delay: { min: 30, max: 60 },
	};

	return (
		<div className={styles.overlay}>
			{isWinner && (
				<Fireworks
				options={options}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 1,
				}}
				/>
			)}
			<div className={styles.modal}>
				<h2>{message}</h2>
				<button className={styles.closeButton} onClick={onClose}>Tancar</button>
			</div>
		</div>
	);
}
