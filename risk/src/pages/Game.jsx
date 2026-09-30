import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '../store/gameStore';
import MapCanvas from '../components/MapCanvas';
import GameOverModal from '../components/GameOverModal';
import styles from './styles/Game.module.css';

// Pper abandonar partida de forma segura
const sendLeaveGame = (ws) => {
	if (ws && ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify({ action: 'leave_game' }));
	}
};

// Per girar daus (simula llançament)
function rollRandomDice(count) {
  	return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

// Convertir els noms dels territoris com per exemple "southern_europe" a Southern Europe
function prettifyName(name) {
	if (!name) return '';
	return name
		.split('_')
		.map(w => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');
}

export default function Game() {
	const navigate = useNavigate();
	const ws = useGameStore((s) => s.webSocket);
	const players = useGameStore((s) => s.players);
	const playerColors = useGameStore((s) => s.playerColors);
	const stage = useGameStore((s) => s.stage);
	const selTroops = useGameStore((s) => s.selTroops);
	const setSelTroops = useGameStore((s) => s.setSelTroops);
	const selectedCountryId = useGameStore((s) => s.selectedCountryId);
	const setSelectedCountryId = useGameStore((s) => s.setSelectedCountryId);
	const attackerCountryId = useGameStore((s) => s.attackerCountryId);
	const defenderCountryId = useGameStore((s) => s.defenderCountryId);
	const currentPlayerId = useGameStore((s) => s.currentPlayerId);
	const userId = useGameStore((s) => s.user?.id);
	const setPlayers = useGameStore((s) => s.setPlayers);
	const setCurrentPlayerId = useGameStore((s) => s.setCurrentPlayerId);
	const setStage = useGameStore((s) => s.setStage);
	const setCountries = useGameStore((s) => s.setCountries);
	const setBonusTroops = useGameStore((s) => s.setBonusTroops);
	const setWebSocket = useGameStore((s) => s.setWebSocket);
	const resetGame = useGameStore((s) => s.resetGame);

	// Tropes restants (fase BONUS)
	const bonusTroops = useGameStore((s) => s.bonusTroops);

	// Estats per a la UI i gestió de moviments
	const [lastMessage, setLastMessage] = useState('');
	const [moveMax, setMoveMax] = useState(0);
	const [moveSource, setMoveSource] = useState(null);
	const [moveTarget, setMoveTarget] = useState(null);
	const [pendingMove, setPendingMove] = useState(false);
	const [moveCount, setMoveCount] = useState(1);
	const [conquestSource, setConquestSource] = useState(null);
	const [conquestTarget, setConquestTarget] = useState(null);

	// Daus i animació
	const [attackerDice, setAttackerDice] = useState([]);
	const [defenderDice, setDefenderDice] = useState([]);
	const [showDiceModal, setShowDiceModal] = useState(false);
	const [diceRolling, setDiceRolling] = useState(false);
	const rollIntervalRef = useRef(null);
	const hasReceivedWinRef = useRef(false);

	// Estat modal de fi de partida
	const [showGameOverModal, setShowGameOverModal] = useState(false);
	const [gameOverMessage, setGameOverMessage] = useState('');

	// Màxim de tropes per fase
	const maxTroops =
		stage === 'ATTACKING'
		? 3
		: stage === 'BONUS'
		? bonusTroops
		: stage === 'REFORCE'
		? (() => {
			const source = useGameStore.getState().countries.find((c) => c.id === attackerCountryId);
			return source ? Math.max(1, (source.troops || 1) - 1) : 1;
			})()
		: 0;

	// Reset selTroops quan canvia fase o bonus
	useEffect(() => {
		if (stage === 'BONUS') {
			setSelTroops((curr) => Math.max(1, Math.min(curr, bonusTroops)));
		} 
		else if (stage === 'ATTACKING' || stage === 'REFORCE') {
			setSelTroops(1);
		}
	}, [stage, bonusTroops, setSelTroops]);

	// Enviar 1 tropa en clicar territori durant PLACEMENT
	useEffect(() => {
		if (!stage && selectedCountryId != null) {
			ws.send(
				JSON.stringify({
					action: 'send_input',
					data: { type: 'place_troops', countryId: selectedCountryId, troops: 1 },
				})
			);
			setSelectedCountryId(null);
		}
	}, [stage, selectedCountryId, ws, setSelectedCountryId]);

	// Animació daus
	useEffect(() => {
		if (showDiceModal && diceRolling) {
			rollIntervalRef.current = setInterval(() => {
				setAttackerDice(rollRandomDice(selTroops));
				const defenderCount = Math.min(2, useGameStore.getState().countries.find((c) => c.id === defenderCountryId).troops || 2);
				setDefenderDice(rollRandomDice(defenderCount));
			}, 80);
		}
		else {
			clearInterval(rollIntervalRef.current);
			rollIntervalRef.current = null;
		}

		return () => clearInterval(rollIntervalRef.current);
	}, [showDiceModal, diceRolling, selTroops, defenderCountryId]);

	// Handler WebSocket (map_update, daus, etc.)
	useEffect(() => {
		if (!ws) return;
		const handler = async (ev) => {
			const raw = ev.data instanceof Blob ? await ev.data.text() : ev.data;
			let msg;
			try { msg = JSON.parse(raw); } catch { return; }

			if (msg.message) setLastMessage(msg.message);

			switch (msg.action) {
				case 'player_list':
					setPlayers(msg.players);
					break;
					
				case 'player_turn':
					setCurrentPlayerId(msg.playerId);
					break;

				case 'stage_change':
					setStage(msg.stage);
					break;
				// En alguns case comencem amb claudatros per poder declarar variables a dins
				case 'map_update': {
					const current = useGameStore.getState().countries;
					const merged = current.map((c) => {
						const upd = msg.countries.find((u) => u.countryId === c.id);
						return upd
						? { ...c, troops: upd.troops, owner: upd.playerId }
						: c;
					});
					setCountries(merged);
					break;
				}

				case 'bonus_to_place':
					if (msg.playerId === userId) {
						setBonusTroops(msg.totalTroopsToPlace);
						setSelTroops((cur) => Math.max(1, Math.min(cur, msg.totalTroopsToPlace)));
					}
					break;

				case 'troops_placed': {
					setBonusTroops(msg.remainingTroops);
					setSelTroops((cur) => Math.min(cur, msg.remainingTroops > 0 ? msg.remainingTroops : 1));
					const updated = useGameStore
						.getState()
						.countries.map((c) =>
						c.id === msg.countryId
							? { ...c, troops: (c.troops || 0) + msg.troopsPlaced }
							: c
						);
					setCountries(updated);
					break;
				}

				case 'attack_initiated':
					setShowDiceModal(true);
					setDiceRolling(true);
					break;

				case 'dice_rolls':
					setDiceRolling(false);
					setAttackerDice(msg.attackerDice || []);
					setDefenderDice(msg.defenderDice || []);
					setTimeout(() => setShowDiceModal(false), 1200);
					break;

				case 'attack_result':
					if (msg.targetConquered) {
						setConquestSource(msg.sourceCountryId);
						setConquestTarget(msg.targetCountryId);
						setPendingMove(true);
						setMoveMax(msg.maxTroops || 1);
						setMoveSource(msg.sourceCountryId);
						setMoveTarget(msg.targetCountryId);
						setMoveCount(1);
					} else {
						setPendingMove(false);
						setConquestSource(null);
						setConquestTarget(null);
					}
					break;

				case 'move_troops':
					setMoveMax(msg.maxTroops);
					setMoveSource(msg.sourceCountryId);
					setMoveTarget(msg.targetCountryId);
					setPendingMove(true);
					break;

				case 'win':
					setGameOverMessage(msg.message);
					setShowGameOverModal(true);
					hasReceivedWinRef.current = true;
					break;

				case 'game_over':
				case 'game_ended':
					if (!hasReceivedWinRef.current) {
						setGameOverMessage(msg.message);
						setShowGameOverModal(true);
					}
					break;

				default:
					break;
			}
		};
		ws.addEventListener('message', handler);

		return () => {
			ws.removeEventListener('message', handler);
			clearInterval(rollIntervalRef.current);
		};
	}, [ws, userId, setPlayers, setCurrentPlayerId, setStage, setCountries, setBonusTroops]);

	// Netegem el missatge després de 10 segons
	useEffect(() => {
		if (lastMessage && currentPlayerId === userId) {
			const timer = setTimeout(() => setLastMessage(''), 10000);
			return () => clearTimeout(timer);
		}
	}, [lastMessage, currentPlayerId, userId]);

	// Funcions per enviar accions
	const confirmAttack = () => ws.send(
		JSON.stringify({
			action: 'send_input',
			data: {
			type: 'attack',
			countryId: attackerCountryId,
			enemyCountryId: defenderCountryId,
			troops: selTroops,
			},
		})
	);

	const endAttackPhase = () => ws.send(JSON.stringify({ action: 'send_input', data: { type: 'end_attack' } }));

	const confirmFortify = () => ws.send(
		JSON.stringify({
			action: 'send_input',
			data: {
			type: 'fortify',
			sourceCountryId: attackerCountryId,
			targetCountryId: defenderCountryId,
			troops: selTroops,
			},
		})
	);

	const endTurn = () => ws.send(JSON.stringify({ action: 'send_input', data: { type: 'end_turn' } }));

	const confirmMove = () => { 
		ws.send(
			JSON.stringify({
				action: 'send_input',
				data: { type: 'move_troops', troops: moveCount },
			})
		);
		
		setPendingMove(false);
		setConquestSource(null);
		setConquestTarget(null);
	};

	return (
		<div className={styles.gameContainer}>
			{/* Game over */}
			<GameOverModal
				show={showGameOverModal}
				message={gameOverMessage}
				isWinner={hasReceivedWinRef.current}
				onClose={() => {
				setShowGameOverModal(false);
				ws.close();
				setWebSocket(null);
				resetGame();
				navigate('/');
				}}
			/>

			{/* Dau modal */}
			{showDiceModal && (
				<div className={styles.modalOverlay}>
					<div className={styles.diceModal}>
						<h3>Atacant llança:</h3>
						<div className={styles.diceList}>
							{attackerDice.map((d, i) => (
								<span key={i} className={styles.die}>{d}</span>
							))}
						</div>
						<h3>Defensor llança:</h3>
						<div className={styles.diceList}>
							{defenderDice.map((d, i) => (
								<span key={i} className={styles.die}>{d}</span>
							))}
						</div>

						{!diceRolling && (
						<button onClick={() => setShowDiceModal(false)}>Tancar</button>
						)}
					</div>
				</div>
			)}

			<aside className={styles.sidebar}>
				<h2 className={styles.sidebarTitle}>Jugadors</h2>
				<ul className={styles.playerList}>
					{players.map((player) => (
						<li
						key={player.id}
						className={`
							${styles.player}
							${player.id === currentPlayerId ? styles.currentPlayer : ''}
							${player.id === userId ? styles.isYou : ''}
						`}
						style={{ backgroundColor: playerColors[player.id] }}
						>
						<img
							src={player.avatar_url}
							alt={`${player.username || `Jugador ${player.id}`} avatar`}
							className={styles.avatar}
						/>
						<span>{player.username || `Jugador ${player.id}`}</span>
						{player.id === currentPlayerId && (
							<span className={styles.turnTag}>Torn!</span>
						)}
						</li>
					))}
				</ul>

				<button
					className={styles.leaveButton}
					onClick={() => {
						sendLeaveGame(ws);
						ws.close();
						setWebSocket(null);
						resetGame();
						navigate('/');
					}}
				>
				Abandonar partida
				</button>
			</aside>

			<main className={styles.mainContent}>
				<div className={styles.mapFrame}>
					<MapCanvas />
					<div className={styles.controls}>
						{stage && currentPlayerId === userId && !pendingMove && (
						<>
							<label htmlFor="troopsSelect">Tropes:</label>
							<input
								id="troopsSelect"
								type="number"
								min="1"
								max={maxTroops}
								value={Number(selTroops) || 1}
								onChange={(e) => {
									const val = Math.max(1, Math.min(Number(e.target.value), maxTroops));
									setSelTroops(isNaN(val) ? 1 : val);
								}}
							/>

							{/* Col·locar bonus (fase BONUS) */}
							{stage === 'BONUS' && (
							<>
								<p className={styles.bonusInfo}>
								Tropes restants per col·locar: <b>{bonusTroops}</b>
								</p>
								<button
								disabled={!selectedCountryId}
								onClick={() =>
									ws.send(
									JSON.stringify({
										action: 'send_input',
										data: {
										type: 'place_troops',
										countryId: selectedCountryId,
										troops: Number(selTroops) || 1,
										},
									})
									)
								}
								>
								Col·locar bonus
								</button>
							</>
							)}

							{/* Atac i reforç */}
							{stage === 'ATTACKING' && attackerCountryId && defenderCountryId && (
							<button onClick={confirmAttack} disabled={pendingMove}>
								Confirmar Atac ({selTroops} tropes)
							</button>
							)}
							{stage === 'ATTACKING' && (
							<button onClick={endAttackPhase} disabled={pendingMove}>
								Finalitzar Atac
							</button>
							)}
							{stage === 'REFORCE' && attackerCountryId && defenderCountryId && (
							<button onClick={confirmFortify}>
								Fortificar ({selTroops} tropes)
							</button>
							)}
							{stage === 'REFORCE' && (
							<button onClick={endTurn}>Finalitzar Torn</button>
							)}
						</>
						)}

						{/* Controls de moviment després de conquest o fortificació */}
						{pendingMove && (
						<div className={styles.moveControls}>
							<p>
								Mou tropes de{' '}
							<b>
								{prettifyName(
									useGameStore.getState().countries.find((c) => c.id === moveSource)?.name
								)}
							</b>{' '}
								a{' '}
							<b>
								{prettifyName(
									useGameStore.getState().countries.find((c) => c.id === moveTarget)?.name
								)}
							</b>{' '}
							<span style={{ marginLeft: 8, color: '#888' }}>(max {moveMax})</span>
							</p>
							<input
								type="number"
								min="1"
								max={moveMax}
								value={moveCount}
								onChange={(e) => setMoveCount(Number(e.target.value))}
							/>
							<button onClick={confirmMove} disabled={moveCount < 1}>
								Confirmar Moviment
							</button>
						</div>
						)}
					</div>
				</div>
			</main>

			<aside className={styles.stagePanel}>
				<h2>Fase Actual</h2>
				<p className={styles.stageText}>{stage || 'PLACEMENT'}</p>
				{currentPlayerId === userId && lastMessage && (
					<p className={styles.messageText}>{lastMessage}</p>
				)}
			</aside>
		</div>
	);
}