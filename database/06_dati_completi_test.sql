-- ============================================================
-- SCRIPT COMPLETO: DATI TEST + RAPPORTINI + PROGRESS
-- ============================================================
-- Esegui questo script per avere un set completo di dati
-- per testare l'applicazione
-- ============================================================

-- STEP 1: Pulisci dati test precedenti
DELETE FROM progress_fisico WHERE inserito_da_persona_id IN (SELECT id FROM persone WHERE nome LIKE 'TEST_%');
DELETE FROM ore_lavorate WHERE rapportino_id IN (SELECT id FROM rapportini WHERE foreman_persona_id IN (SELECT id FROM persone WHERE nome LIKE 'TEST_%'));
DELETE FROM rapportini WHERE foreman_persona_id IN (SELECT id FROM persone WHERE nome LIKE 'TEST_%');
DELETE FROM presenze WHERE persona_id IN (SELECT id FROM persone WHERE nome LIKE 'TEST_%');
DELETE FROM assegnazioni_progetto WHERE badge_number LIKE 'TEST-%';
DELETE FROM persone WHERE nome LIKE 'TEST_%';
DELETE FROM ditte WHERE codice LIKE 'TEST-%';

-- STEP 2: Crea Ditte Test
INSERT INTO ditte (codice, ragione_sociale, tipo, attiva) VALUES
('TEST-DITTA-001', 'TEST_Metalpiping Srl', 'subappaltatore', true),
('TEST-DITTA-002', 'TEST_Elettro Impianti SpA', 'subappaltatore', true),
('TEST-DITTA-003', 'TEST_Civile Costruzioni', 'subappaltatore', true)
ON CONFLICT (codice) DO NOTHING;

-- STEP 3: Crea Persone e Assegnazioni
DO $$
DECLARE
  v_progetto_id UUID;
  v_ditta_interna_id UUID;
  v_ditta_metal_id UUID;
  v_ditta_elettro_id UUID;
  v_ditta_civile_id UUID;
  
  v_cm_id UUID;
  v_sup_id UUID;
  v_foreman_pip_id UUID;
  v_foreman_ele_id UUID;
  v_foreman_civ_id UUID;
  v_helper1_id UUID;
  v_helper2_id UUID;
  v_helper3_id UUID;
  v_helper4_id UUID;
  v_helper5_id UUID;
  v_helper6_id UUID;
  
  v_ass_foreman_pip_id UUID;
  v_ass_foreman_ele_id UUID;
  v_ass_foreman_civ_id UUID;
  
  v_cc_pip_hp_id UUID;
  v_cc_pip_util_id UUID;
  v_cc_eqp_id UUID;
  v_cc_ele_id UUID;
  v_cc_ins_id UUID;
  
  v_rapportino_id UUID;
  v_data DATE;
  i INTEGER;
BEGIN
  -- Ottieni IDs esistenti
  SELECT id INTO v_progetto_id FROM progetti WHERE codice = 'PRJ-PARMA-001';
  SELECT id INTO v_ditta_interna_id FROM ditte WHERE codice = 'INT-001';
  SELECT id INTO v_ditta_metal_id FROM ditte WHERE codice = 'TEST-DITTA-001';
  SELECT id INTO v_ditta_elettro_id FROM ditte WHERE codice = 'TEST-DITTA-002';
  SELECT id INTO v_ditta_civile_id FROM ditte WHERE codice = 'TEST-DITTA-003';
  
  -- Ottieni centri costo
  SELECT id INTO v_cc_pip_hp_id FROM centri_costo WHERE codice = 'CC-PIP-001' AND progetto_id = v_progetto_id;
  SELECT id INTO v_cc_pip_util_id FROM centri_costo WHERE codice = 'CC-PIP-002' AND progetto_id = v_progetto_id;
  SELECT id INTO v_cc_eqp_id FROM centri_costo WHERE codice = 'CC-EQP-001' AND progetto_id = v_progetto_id;
  SELECT id INTO v_cc_ele_id FROM centri_costo WHERE codice = 'CC-ELE-001' AND progetto_id = v_progetto_id;
  SELECT id INTO v_cc_ins_id FROM centri_costo WHERE codice = 'CC-INS-001' AND progetto_id = v_progetto_id;

  IF v_progetto_id IS NULL THEN
    RAISE EXCEPTION 'Progetto PRJ-PARMA-001 non trovato!';
  END IF;

  -- ============================================================
  -- PERSONE
  -- ============================================================
  
  -- CM
  INSERT INTO persone (nome, cognome, email, telefono, attivo)
  VALUES ('TEST_Giovanni', 'Bianchi', 'test.cm@demo.local', '+39 333 1111111', true)
  RETURNING id INTO v_cm_id;
  
  -- Supervisor
  INSERT INTO persone (nome, cognome, email, telefono, attivo)
  VALUES ('TEST_Laura', 'Rossi', 'test.sup@demo.local', '+39 333 2222222', true)
  RETURNING id INTO v_sup_id;
  
  -- Foreman Piping
  INSERT INTO persone (nome, cognome, email, telefono, attivo)
  VALUES ('TEST_Marco', 'Verdi', 'test.f.pip@demo.local', '+39 333 3333333', true)
  RETURNING id INTO v_foreman_pip_id;
  
  -- Foreman Elettrico
  INSERT INTO persone (nome, cognome, email, telefono, attivo)
  VALUES ('TEST_Paolo', 'Neri', 'test.f.ele@demo.local', '+39 333 4444444', true)
  RETURNING id INTO v_foreman_ele_id;
  
  -- Foreman Civile
  INSERT INTO persone (nome, cognome, email, telefono, attivo)
  VALUES ('TEST_Andrea', 'Gialli', 'test.f.civ@demo.local', '+39 333 5555555', true)
  RETURNING id INTO v_foreman_civ_id;
  
  -- Helper Piping
  INSERT INTO persone (nome, cognome, email, attivo) VALUES ('TEST_Luca', 'Saldatore', 'test.h1@demo.local', true) RETURNING id INTO v_helper1_id;
  INSERT INTO persone (nome, cognome, email, attivo) VALUES ('TEST_Mario', 'Tubista', 'test.h2@demo.local', true) RETURNING id INTO v_helper2_id;
  
  -- Helper Elettrico
  INSERT INTO persone (nome, cognome, email, attivo) VALUES ('TEST_Franco', 'Elettricista', 'test.h3@demo.local', true) RETURNING id INTO v_helper3_id;
  INSERT INTO persone (nome, cognome, email, attivo) VALUES ('TEST_Sergio', 'Cablatore', 'test.h4@demo.local', true) RETURNING id INTO v_helper4_id;
  
  -- Helper Civile
  INSERT INTO persone (nome, cognome, email, attivo) VALUES ('TEST_Bruno', 'Muratore', 'test.h5@demo.local', true) RETURNING id INTO v_helper5_id;
  INSERT INTO persone (nome, cognome, email, attivo) VALUES ('TEST_Enzo', 'Carpentiere', 'test.h6@demo.local', true) RETURNING id INTO v_helper6_id;

  -- ============================================================
  -- ASSEGNAZIONI
  -- ============================================================
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, attivo)
  VALUES (v_cm_id, v_progetto_id, v_ditta_interna_id, 'cm', 'Construction Manager', 'TEST-CM01', true);
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, attivo)
  VALUES (v_sup_id, v_progetto_id, v_ditta_interna_id, 'supervisor', 'Site Supervisor', 'TEST-SUP01', true);
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, attivo)
  VALUES (v_foreman_pip_id, v_progetto_id, v_ditta_interna_id, 'foreman', 'Capo Squadra Piping', 'TEST-F01', true)
  RETURNING id INTO v_ass_foreman_pip_id;
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, attivo)
  VALUES (v_foreman_ele_id, v_progetto_id, v_ditta_interna_id, 'foreman', 'Capo Squadra E&I', 'TEST-F02', true)
  RETURNING id INTO v_ass_foreman_ele_id;
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, attivo)
  VALUES (v_foreman_civ_id, v_progetto_id, v_ditta_interna_id, 'foreman', 'Capo Squadra Civile', 'TEST-F03', true)
  RETURNING id INTO v_ass_foreman_civ_id;
  
  -- Helper con riporta_a_id
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, riporta_a_id, attivo)
  VALUES (v_helper1_id, v_progetto_id, v_ditta_metal_id, 'helper', 'Saldatore TIG/MIG', 'TEST-001', v_ass_foreman_pip_id, true);
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, riporta_a_id, attivo)
  VALUES (v_helper2_id, v_progetto_id, v_ditta_metal_id, 'helper', 'Tubista', 'TEST-002', v_ass_foreman_pip_id, true);
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, riporta_a_id, attivo)
  VALUES (v_helper3_id, v_progetto_id, v_ditta_elettro_id, 'helper', 'Elettricista MT/BT', 'TEST-003', v_ass_foreman_ele_id, true);
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, riporta_a_id, attivo)
  VALUES (v_helper4_id, v_progetto_id, v_ditta_elettro_id, 'helper', 'Cablatore', 'TEST-004', v_ass_foreman_ele_id, true);
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, riporta_a_id, attivo)
  VALUES (v_helper5_id, v_progetto_id, v_ditta_civile_id, 'helper', 'Muratore', 'TEST-005', v_ass_foreman_civ_id, true);
  
  INSERT INTO assegnazioni_progetto (persona_id, progetto_id, ditta_id, ruolo, qualifica, badge_number, riporta_a_id, attivo)
  VALUES (v_helper6_id, v_progetto_id, v_ditta_civile_id, 'helper', 'Carpentiere', 'TEST-006', v_ass_foreman_civ_id, true);

  -- ============================================================
  -- RAPPORTINI E ORE LAVORATE (Ultimi 10 giorni lavorativi)
  -- ============================================================
  
  FOR i IN 1..10 LOOP
    v_data := CURRENT_DATE - (i || ' days')::interval;
    
    -- Salta domeniche
    IF EXTRACT(DOW FROM v_data) = 0 THEN
      CONTINUE;
    END IF;
    
    -- Rapportino Piping HP
    IF v_cc_pip_hp_id IS NOT NULL THEN
      INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
      VALUES (v_foreman_pip_id, v_progetto_id, v_cc_pip_hp_id, v_data, 
        CASE (i % 4)
          WHEN 0 THEN 'Prefabbricazione linee HP 6"-8". Saldature GTAW root.'
          WHEN 1 THEN 'Montaggio linee HP area compressori. Supporteria.'
          WHEN 2 THEN 'NDT e riparazioni saldature. Documentazione WPS.'
          ELSE 'Tie-in su linee esistenti. Collaudo tenuta.'
        END,
        'approvato', true)
      RETURNING id INTO v_rapportino_id;
      
      -- Ore
      INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza)
      VALUES 
        (v_rapportino_id, v_helper1_id, CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN 6 ELSE 10 END, CASE WHEN i % 3 = 0 THEN 2 ELSE 0 END, 'presente'),
        (v_rapportino_id, v_helper2_id, CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN 6 ELSE 10 END, 0, 'presente');
      
      -- Progress (pollici saldati)
      INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
      VALUES (v_cc_pip_hp_id, v_foreman_pip_id, v_data, 
        CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN 35 + (random() * 15)::int ELSE 55 + (random() * 25)::int END,
        'Pollici saldati giornata');
    END IF;
    
    -- Rapportino Elettrico (giorni alterni)
    IF v_cc_ele_id IS NOT NULL AND i % 2 = 0 THEN
      INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
      VALUES (v_foreman_ele_id, v_progetto_id, v_cc_ele_id, v_data, 
        CASE (i % 3)
          WHEN 0 THEN 'Posa cavi MT su rack. Terminazioni.'
          WHEN 1 THEN 'Cablaggio quadri MCC. Test continuità.'
          ELSE 'Posa cavi BT e segnale. Etichettatura.'
        END,
        'approvato', true)
      RETURNING id INTO v_rapportino_id;
      
      INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza)
      VALUES 
        (v_rapportino_id, v_helper3_id, CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN 6 ELSE 10 END, 0, 'presente'),
        (v_rapportino_id, v_helper4_id, CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN 6 ELSE 10 END, 0, 'presente');
      
      -- Progress (metri cavo)
      INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
      VALUES (v_cc_ele_id, v_foreman_ele_id, v_data, 
        CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN 180 + (random() * 50)::int ELSE 280 + (random() * 80)::int END,
        'Metri cavo posati');
    END IF;
    
    -- Rapportino Equipment (ogni 3 giorni)
    IF v_cc_eqp_id IS NOT NULL AND i % 3 = 0 THEN
      INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
      VALUES (v_foreman_civ_id, v_progetto_id, v_cc_eqp_id, v_data, 
        'Posizionamento equipment. Allineamento e grouting.',
        'approvato', true)
      RETURNING id INTO v_rapportino_id;
      
      INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza)
      VALUES 
        (v_rapportino_id, v_helper5_id, 10, 2, 'presente'),
        (v_rapportino_id, v_helper6_id, 10, 2, 'presente');
      
      -- Progress (equipment e tonnellate)
      INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, quantita_secondaria_fatta, note)
      VALUES (v_cc_eqp_id, v_foreman_civ_id, v_data, 1, 35 + (random() * 20)::int, '1 equipment posizionato');
    END IF;
    
    -- Presenze
    INSERT INTO presenze (persona_id, progetto_id, data, ora_checkin, ora_checkout, lat_checkin, lng_checkin)
    SELECT 
      p.id, v_progetto_id, v_data, '07:00'::time,
      CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN '13:00'::time ELSE '17:00'::time END,
      44.7857, 10.3081
    FROM persone p WHERE p.nome LIKE 'TEST_%'
    ON CONFLICT (persona_id, progetto_id, data) DO NOTHING;
    
  END LOOP;

  RAISE NOTICE '✅ Dati completi creati!';
  RAISE NOTICE '- 11 persone test (1 CM, 1 Sup, 3 Foreman, 6 Helper)';
  RAISE NOTICE '- 3 ditte test';
  RAISE NOTICE '- ~25 rapportini con ore e progress';
  
END $$;

-- ============================================================
-- VERIFICA
-- ============================================================

SELECT 'PERSONE TEST:' as info, COUNT(*) as count FROM persone WHERE nome LIKE 'TEST_%';
SELECT 'RAPPORTINI:' as info, COUNT(*) as count FROM rapportini WHERE foreman_persona_id IN (SELECT id FROM persone WHERE nome LIKE 'TEST_%');
SELECT 'ORE LAVORATE:' as info, SUM(ore_ordinarie + ore_straordinario) as ore_totali FROM ore_lavorate;

-- Progress per CC
SELECT 
  cc.codice,
  cc.nome,
  COALESCE(SUM(pf.quantita_fatta), 0) as fatto,
  cc.budget_quantita as budget,
  ROUND(COALESCE(SUM(pf.quantita_fatta), 0) / NULLIF(cc.budget_quantita, 0) * 100, 1) as perc
FROM centri_costo cc
LEFT JOIN progress_fisico pf ON pf.centro_costo_id = cc.id
WHERE cc.progetto_id = (SELECT id FROM progetti WHERE codice = 'PRJ-PARMA-001')
GROUP BY cc.id, cc.codice, cc.nome, cc.budget_quantita
ORDER BY cc.codice;
