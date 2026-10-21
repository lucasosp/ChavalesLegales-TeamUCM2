'use client'

/**
 * AvatarGeometrico: Componente SVG paramétrico estilo Duolingo
 * Flat design, minimalista y sin contornos (stroke="none").
 */
export default function AvatarGeometrico({
  baseType = 1,
  colorPelo = '#4A2810',
  tieneGorro = true,
  colorRopa = '#4A1A1C',
  size = 100,
  x = 0,
  y = 0,
  standalone = false,
  className = '',
}) {
  const content = (
    <g className={`avatar-geo ${className}`}>
      {/* ==============================================================
          BASE 1: EL CHAVAL CURIOSO (Personalizable: colorPelo)
          ============================================================== */}
      {baseType === 1 && (
        <g>
          {/* Torso con sudadera redondeada */}
          <rect x="-24" y="-12" width="48" height="26" rx="13" fill={colorRopa || '#4A1A1C'} />
          {/* Cuello decorativo */}
          <ellipse cx="0" cy="-11" rx="10" ry="4" fill="#FACC15" />

          {/* Cuello del personaje */}
          <rect x="-6" y="-26" width="12" height="16" rx="4" fill="#F0BE9A" />

          {/* Cabeza suave y redondeada */}
          <rect x="-18" y="-48" width="36" height="32" rx="16" fill="#FDE0C5" />

          {/* Pelo geométrico flat (colorPelo) */}
          <rect x="-19" y="-56" width="38" height="16" rx="8" fill={colorPelo || '#4A2810'} />
          <path d="M -18 -48 Q -6 -46 -1 -41 Q -9 -39 -18 -42 Z" fill={colorPelo || '#4A2810'} />
          <rect x="-20" y="-47" width="5" height="12" rx="2.5" fill={colorPelo || '#4A2810'} />
          <rect x="15" y="-47" width="5" height="12" rx="2.5" fill={colorPelo || '#4A2810'} />
          {/* Brillo suave de pelo */}
          <rect x="-12" y="-54" width="24" height="3.5" rx="1.75" fill="#FFFFFF" opacity="0.25" />

          {/* Ojos expresivos estilo Duolingo (sin contorno) */}
          <circle cx="-7.5" cy="-33" r="3.4" fill="#18181B" />
          <circle cx="7.5" cy="-33" r="3.4" fill="#18181B" />
          {/* Brillos oculares */}
          <circle cx="-6.2" cy="-34.2" r="1.1" fill="#FFFFFF" />
          <circle cx="8.8" cy="-34.2" r="1.1" fill="#FFFFFF" />
          <circle cx="-8.2" cy="-32" r="0.6" fill="#FFFFFF" />
          <circle cx="6.8" cy="-32" r="0.6" fill="#FFFFFF" />

          {/* Cejas planas */}
          <rect x="-11" y="-40" width="7" height="2" rx="1" fill={colorPelo || '#4A2810'} />
          <rect x="4" y="-40" width="7" height="2" rx="1" fill={colorPelo || '#4A2810'} />

          {/* Mejillas sonrosadas */}
          <rect x="-14" y="-28" width="5.5" height="2.8" rx="1.4" fill="#F43F5E" opacity="0.45" />
          <rect x="8.5" y="-28" width="5.5" height="2.8" rx="1.4" fill="#F43F5E" opacity="0.45" />

          {/* Sonrisa alegre con lengua */}
          <path d="M -4 -25 Q 0 -22 4 -25 Q 0 -19 -4 -25 Z" fill="#18181B" />
          <path d="M -2.5 -23.5 Q 0 -21.5 2.5 -23.5 Q 0 -20 -2.5 -23.5 Z" fill="#F43F5E" />
        </g>
      )}

      {/* ==============================================================
          BASE 3: SABIO / CASUAL (Personalizable: colorRopa)
          ============================================================== */}
      {baseType === 3 && (
        <g>
          {/* Torso con sudadera amplia */}
          <rect x="-27" y="-14" width="54" height="30" rx="14" fill={colorRopa || '#B03921'} />
          {/* Solapa / cuello de sudadera */}
          <path d="M -14 -14 Q 0 -6 14 -14 Q 0 0 -14 -14 Z" fill="#FFFFFF" opacity="0.2" />

          {/* Cuello ancho */}
          <rect x="-7" y="-28" width="14" height="18" rx="4" fill="#E5A882" />

          {/* Pelo afro / rizado geométrico voluminoso */}
          <g fill={colorPelo || '#18181B'}>
            <circle cx="-15" cy="-48" r="9" />
            <circle cx="-6" cy="-55" r="9.5" />
            <circle cx="6" cy="-54" r="9.5" />
            <circle cx="15" cy="-47" r="9" />
            <circle cx="0" cy="-47" r="8" />
          </g>

          {/* Cabeza cuadrada suave */}
          <rect x="-20" y="-48" width="40" height="34" rx="15" fill="#F8C7A3" />

          {/* Gafas de pasta planas geométricas */}
          <circle cx="-8" cy="-34" r="6.5" fill="#FFFFFF" opacity="0.3" />
          <circle cx="-8" cy="-34" r="6.5" fill="none" stroke="#18181B" strokeWidth="2.2" />
          <circle cx="8" cy="-34" r="6.5" fill="#FFFFFF" opacity="0.3" />
          <circle cx="8" cy="-34" r="6.5" fill="none" stroke="#18181B" strokeWidth="2.2" />
          <rect x="-2.5" y="-35" width="5" height="2" rx="1" fill="#18181B" />

          {/* Ojos tras las gafas */}
          <circle cx="-8" cy="-34" r="2.6" fill="#18181B" />
          <circle cx="8" cy="-34" r="2.6" fill="#18181B" />
          <circle cx="-7" cy="-35" r="0.9" fill="#FFFFFF" />
          <circle cx="9" cy="-35" r="0.9" fill="#FFFFFF" />

          {/* Cejas arqueadas amigables */}
          <rect x="-12" y="-44" width="7" height="2" rx="1" fill="#18181B" />
          <rect x="5" y="-44" width="7" height="2" rx="1" fill="#18181B" />

          {/* Mejillas sonrosadas */}
          <rect x="-16" y="-29" width="6" height="3" rx="1.5" fill="#F43F5E" opacity="0.4" />
          <rect x="10" y="-29" width="6" height="3" rx="1.5" fill="#F43F5E" opacity="0.4" />

          {/* Sonrisa ancha */}
          <path d="M -5 -25 Q 0 -20 5 -25" stroke="#18181B" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* ==============================================================
          BASE 4: CHICA CON MOÑO ALTO (Personalizable: colorPelo)
          ============================================================== */}
      {(baseType === 4 || baseType === 2) && (
        <g>
          {/* Torso con camiseta suave */}
          <rect x="-24" y="-12" width="48" height="26" rx="13" fill={colorRopa || '#3D4A27'} />
          {/* Detalle de cuello en V suave */}
          <path d="M -8 -12 Q 0 -6 8 -12 Z" fill="#FDE0C5" />

          {/* Cuello del personaje */}
          <rect x="-5" y="-26" width="10" height="16" rx="4" fill="#F0BE9A" />

          {/* Cabeza suave y redondeada */}
          <rect x="-17" y="-48" width="34" height="32" rx="16" fill="#FDE0C5" />

          {/* Moño alto geométrico arriba de la cabeza */}
          <circle cx="0" cy="-59" r="10.5" fill={colorPelo || '#4A2810'} />
          <circle cx="-3" cy="-62" r="2.5" fill="#FFFFFF" opacity="0.25" />
          {/* Coletero dorado */}
          <ellipse cx="0" cy="-51" rx="7" ry="2.5" fill="#FACC15" />

          {/* Cabello superior y mechones laterales */}
          <rect x="-18" y="-53" width="36" height="15" rx="7.5" fill={colorPelo || '#4A2810'} />
          <path d="M -17 -47 Q -3 -42 6 -47 Q 14 -44 17 -47 Q 15 -52 -17 -52 Z" fill={colorPelo || '#4A2810'} />
          <rect x="-19" y="-46" width="4.5" height="14" rx="2.2" fill={colorPelo || '#4A2810'} />
          <rect x="14.5" y="-46" width="4.5" height="14" rx="2.2" fill={colorPelo || '#4A2810'} />

          {/* Ojos expresivos Duolingo con pestañas minimalistas sin contorno */}
          <circle cx="-7.5" cy="-33" r="3.4" fill="#18181B" />
          <circle cx="7.5" cy="-33" r="3.4" fill="#18181B" />
          <circle cx="-6.2" cy="-34.2" r="1.1" fill="#FFFFFF" />
          <circle cx="8.8" cy="-34.2" r="1.1" fill="#FFFFFF" />
          <circle cx="-8.2" cy="-32" r="0.6" fill="#FFFFFF" />
          <circle cx="6.8" cy="-32" r="0.6" fill="#FFFFFF" />
          {/* Pestañas planas geométricas */}
          <polygon points="-11,-35 -11.5,-37 -9,-35" fill="#18181B" />
          <polygon points="11,-35 11.5,-37 9,-35" fill="#18181B" />

          {/* Cejas finas */}
          <rect x="-11" y="-39.5" width="7" height="1.8" rx="0.9" fill={colorPelo || '#4A2810'} />
          <rect x="4" y="-39.5" width="7" height="1.8" rx="0.9" fill={colorPelo || '#4A2810'} />

          {/* Mejillas sonrosadas */}
          <circle cx="-11" cy="-27.5" r="3" fill="#F43F5E" opacity="0.45" />
          <circle cx="11" cy="-27.5" r="3" fill="#F43F5E" opacity="0.45" />

          {/* Sonrisa alegre */}
          <path d="M -3.5 -25 Q 0 -22 3.5 -25 Q 0 -19 -3.5 -25 Z" fill="#18181B" />
          <path d="M -2 -23.5 Q 0 -21.5 2 -23.5 Q 0 -20 -2 -23.5 Z" fill="#F43F5E" />
        </g>
      )}

      {/* ==============================================================
          BASE 5: CHICA CON BOB Y DIADEMA (Personalizable: colorRopa)
          ============================================================== */}
      {baseType === 5 && (
        <g>
          {/* Melena bob detrás de la cabeza */}
          <rect x="-21" y="-46" width="42" height="28" rx="12" fill={colorPelo || '#18181B'} />

          {/* Torso con suéter */}
          <rect x="-24" y="-12" width="48" height="26" rx="13" fill={colorRopa || '#B03921'} />
          <ellipse cx="0" cy="-11" rx="9" ry="3.5" fill="#FFFFFF" opacity="0.25" />

          {/* Cuello del personaje */}
          <rect x="-5.5" y="-26" width="11" height="16" rx="4" fill="#E8B490" />

          {/* Cabeza */}
          <rect x="-17" y="-48" width="34" height="32" rx="16" fill="#FCD5B5" />

          {/* Cabello frontal: flequillo dividido */}
          <rect x="-19" y="-55" width="38" height="14" rx="7" fill={colorPelo || '#18181B'} />
          <path d="M -17 -48 C -10 -47 -3 -42 -2 -39 C -8 -41 -15 -43 -17 -48 Z" fill={colorPelo || '#18181B'} />
          <path d="M 17 -48 C 10 -47 3 -42 2 -39 C 8 -41 15 -43 17 -48 Z" fill={colorPelo || '#18181B'} />

          {/* Diadema decorativa dorada con detalle */}
          <path d="M -18 -45 C -18 -57 18 -57 18 -45" stroke="#FACC15" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <circle cx="12" cy="-51" r="3.2" fill="#FACC15" />
          <circle cx="12" cy="-51" r="1.6" fill="#4A1A1C" />

          {/* Ojos expresivos Duolingo con pestaña */}
          <circle cx="-7" cy="-33.5" r="3.3" fill="#18181B" />
          <circle cx="7" cy="-33.5" r="3.3" fill="#18181B" />
          <circle cx="-5.8" cy="-34.6" r="1.1" fill="#FFFFFF" />
          <circle cx="8.2" cy="-34.6" r="1.1" fill="#FFFFFF" />
          <rect x="-10.5" y="-36" width="3" height="1.4" rx="0.7" fill="#18181B" transform="rotate(-25 -10.5 -36)" />
          <rect x="7.5" y="-36" width="3" height="1.4" rx="0.7" fill="#18181B" transform="rotate(25 7.5 -36)" />

          {/* Cejas redondeadas */}
          <rect x="-10.5" y="-39.5" width="6.5" height="1.8" rx="0.9" fill={colorPelo || '#18181B'} />
          <rect x="4" y="-39.5" width="6.5" height="1.8" rx="0.9" fill={colorPelo || '#18181B'} />

          {/* Mejillas sonrosadas */}
          <circle cx="-11" cy="-28" r="3" fill="#F43F5E" opacity="0.4" />
          <circle cx="11" cy="-28" r="3" fill="#F43F5E" opacity="0.4" />

          {/* Sonrisa dulce */}
          <path d="M -3.5 -25 Q 0 -22 3.5 -25" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      )}

      {/* ==============================================================
          BASE 6: LEGALÍN JUEZ (Mono juez con peluca, Personalizable: colorRopa)
          ============================================================== */}
      {(baseType === 6 || baseType === 'legalin') && (
        <g>
          {/* Toga judicial */}
          <rect x="-25" y="-12" width="50" height="26" rx="12" fill={colorRopa || '#064E3B'} />
          {/* Solapas de la toga */}
          <path d="M -14 -12 L -6 2 L -12 2 Z" fill="#000000" opacity="0.25" />
          <path d="M 14 -12 L 6 2 L 12 2 Z" fill="#000000" opacity="0.25" />

          {/* Babero judicial blanco (jabot) */}
          <polygon points="-6,-12 6,-12 8,2 -8,2" fill="#FFFFFF" />
          <line x1="0" y1="-12" x2="0" y2="2" stroke="#E2DED5" strokeWidth="1.2" />
          <polygon points="-4,2 4,2 6,8 -6,8" fill="#F4F1EA" />

          {/* Cuello del mono */}
          <rect x="-6" y="-24" width="12" height="14" rx="4" fill="#8B5A2B" />

          {/* Orejas de mono grandes redondeadas */}
          <circle cx="-20" cy="-35" r="7.5" fill="#8B5A2B" />
          <circle cx="-20" cy="-35" r="4.5" fill="#F2C79B" />
          <circle cx="20" cy="-35" r="7.5" fill="#8B5A2B" />
          <circle cx="20" cy="-35" r="4.5" fill="#F2C79B" />

          {/* Cabeza de mono (pelaje castaño cálido) */}
          <circle cx="0" cy="-38" r="17" fill="#8B5A2B" />

          {/* Máscara facial / morro melocotón suave de mono */}
          <circle cx="-6.5" cy="-36" r="7.5" fill="#F2C79B" />
          <circle cx="6.5" cy="-36" r="7.5" fill="#F2C79B" />
          <ellipse cx="0" cy="-29" rx="11" ry="8" fill="#F2C79B" />

          {/* Cinta de tela en la cabeza */}
          <rect x="-16.5" y="-48.5" width="33" height="6.5" rx="3.25" fill={colorPelo || '#FACC15'} />

          {/* Ojos expresivos estilo Duolingo */}
          <circle cx="-6" cy="-36" r="3.2" fill="#18181B" />
          <circle cx="6" cy="-36" r="3.2" fill="#18181B" />
          <circle cx="-5" cy="-37.2" r="1.1" fill="#FFFFFF" />
          <circle cx="7" cy="-37.2" r="1.1" fill="#FFFFFF" />
          <circle cx="-6.8" cy="-35.2" r="0.6" fill="#FFFFFF" />
          <circle cx="5.2" cy="-35.2" r="0.6" fill="#FFFFFF" />

          {/* Nariz de mono redondeada */}
          <ellipse cx="0" cy="-32" rx="2.8" ry="1.7" fill="#5C3A21" />

          {/* Sonrisa alegre de Legalín */}
          <path d="M -5 -26 Q 0 -22 5 -26" stroke="#18181B" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </g>
      )}
    </g>
  )

  if (standalone) {
    return (
      <svg
        viewBox="-35 -65 70 85"
        width={size}
        height={size}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {content}
      </svg>
    )
  }

  return <g transform={`translate(${x}, ${y})`}>{content}</g>
}
