import { useEffect } from 'react';
import { ReactSVG } from 'react-svg';
import RiskBoard from '../assets/Risk_board.svg';
import useGameStore from '../store/gameStore';
import './styles/MapCanvas.css';

export default function MapCanvas() {
	// Estats del joc
	const countries            = useGameStore((s) => s.countries);
	const playerColors         = useGameStore((s) => s.playerColors);
	const stage                = useGameStore((s) => s.stage);
	const userId               = useGameStore((s) => s.user?.id);
	const currentPlayer        = useGameStore((s) => s.currentPlayerId);
	const bonusTroops          = useGameStore((s) => s.bonusTroops);
	const selTroops            = useGameStore((s) => s.selTroops);

	// Seleccions
	const selectedCountryId    = useGameStore((s) => s.selectedCountryId);
	const setSelectedCountryId = useGameStore((s) => s.setSelectedCountryId);

	const attackerCountryId    = useGameStore((s) => s.attackerCountryId);
	const defenderCountryId    = useGameStore((s) => s.defenderCountryId);
	const setAttackerCountryId = useGameStore((s) => s.setAttackerCountryId);
	const setDefenderCountryId = useGameStore((s) => s.setDefenderCountryId);
	const clearAttackSelection = useGameStore((s) => s.clearAttackSelection);

	// Neteja seleccions al canviar fase
	useEffect(() => {
		setSelectedCountryId(null);
		clearAttackSelection();
	}, [stage]);

	// Dibuixar i manejar events del SVG
	const handleBeforeInjection = (svg) => {
		if (!svg) return;
		const layer = svg.querySelector('#layer4') || svg;
		const ns = svg.namespaceURI;

		countries.forEach((c) => {
			const path = svg.getElementById(c.name);
			if (!path) return;
			
			// Estil bàsic i base
			path.style.removeProperty('filter');
			path.style.fill = c.owner && playerColors[c.owner]
				? playerColors[c.owner]
				: '#333';
			path.style.cursor = 'pointer';
			path.style.transition = 'fill 0.2s';

			// Classes de selecció
			path.classList.toggle('selected', c.id === selectedCountryId);
			path.classList.toggle('selected-origin', c.id === attackerCountryId);
			path.classList.toggle('selected-target', c.id === defenderCountryId);

			// Glow per hover en BONUS
			path.onmouseover = () => {
				if (stage === 'BONUS' && c.owner === userId && bonusTroops > 0) {
					path.classList.add('glow');
				}
			};
			path.onmouseout = () => path.classList.remove('glow');

			// Click handler per fases
			path.onclick = () => {
				if (currentPlayer !== userId) return;

				// Si no hi ha stage inicial aleshores es que es la stage de PLACEMENT
				if (!stage) {
					const anyZero = countries.some((t) => (t.troops || 0) === 0);
					if (anyZero && (c.troops || 0) > 0) {
						alert('Cal col·locar almenys una tropa en cada territori abans de repetir.');
						return;
					}
					setSelectedCountryId(c.id);
					return;
				}

				// BONUS (col·locar tropes)
				if (stage === 'BONUS' && c.owner === userId) {
					const newId = selectedCountryId === c.id ? null : c.id;
					setSelectedCountryId(newId);

					return;
				}

				// ATTACKING (selecció origen/destí d'atac)
				if (stage === 'ATTACKING') {
					if (c.owner === userId) {
						const newAtt = attackerCountryId === c.id ? null : c.id;
						setAttackerCountryId(newAtt);
						return;
					}

					if (attackerCountryId && c.owner !== userId) {
						const newDef = defenderCountryId === c.id ? null : c.id;
						setDefenderCountryId(newDef);
					}

					return;
				}

				// REFORCE (moure tropes entre territoris propis)
				if (stage === 'REFORCE') {
					if (!attackerCountryId && c.owner === userId) {
						setAttackerCountryId(c.id);
						return;
					}

					if (attackerCountryId === c.id) {
						clearAttackSelection();
						return;
					}

					if (attackerCountryId && c.owner === userId && c.id !== attackerCountryId) {
						const newTgt = defenderCountryId === c.id ? null : c.id;
						setDefenderCountryId(newTgt);
					}
					
					return;
				}
			};

			// Afegim text de tropes
			const prevText = layer.querySelector(`text[data-territory=\"${c.name}\"]`);
			if (prevText) layer.removeChild(prevText);

			setTimeout(() => {
				const bbox = path.getBBox();
				const text = document.createElementNS(ns, 'text');
				text.setAttribute('data-territory', c.name);
				text.setAttribute('x', `${bbox.x + bbox.width/2}`);
				text.setAttribute('y', `${bbox.y + bbox.height/2 + 4}`);
				text.setAttribute('text-anchor', 'middle');
				text.setAttribute('font-size', '12');
				text.setAttribute('fill', '#fff');
				text.classList.add('troopText');
				text.textContent = String(c.troops || 0);
				layer.appendChild(text);
			}, 0);
		});
	};

	return (
		<div className="map-container" style={{ position: 'relative', width: 'min(100vw, 900px)' }}>
			<ReactSVG
				src={RiskBoard}
				renumerateIRIElements={false}
				beforeInjection={handleBeforeInjection}
			/>
		</div>
	);
}
