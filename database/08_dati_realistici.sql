-- ============================================================
-- DATI DI ESEMPIO REALISTICI
-- Rapportini, Ore Lavorate, Progress Fisico
-- ============================================================

DO $$
DECLARE
  v_progetto_id UUID;
  v_foreman_marco_id UUID;
  v_foreman_paolo_id UUID;
  v_foreman_andrea_id UUID;
  v_helper1_id UUID;
  v_helper2_id UUID;
  v_helper3_id UUID;
  v_helper4_id UUID;
  v_helper5_id UUID;
  v_helper6_id UUID;
  v_cc_pip001_id UUID;
  v_cc_pip002_id UUID;
  v_cc_eqp001_id UUID;
  v_cc_ele001_id UUID;
  v_rapportino_id UUID;
  v_data DATE;
BEGIN
  -- Ottieni IDs
  SELECT id INTO v_progetto_id FROM progetti WHERE codice = 'PRJ-PARMA-001';
  
  -- Foreman IDs
  SELECT p.id INTO v_foreman_marco_id FROM persone p WHERE p.nome = 'TEST_Marco';
  SELECT p.id INTO v_foreman_paolo_id FROM persone p WHERE p.nome = 'TEST_Paolo';
  SELECT p.id INTO v_foreman_andrea_id FROM persone p WHERE p.nome = 'TEST_Andrea';
  
  -- Helper IDs
  SELECT p.id INTO v_helper1_id FROM persone p WHERE p.nome = 'TEST_Op01';
  SELECT p.id INTO v_helper2_id FROM persone p WHERE p.nome = 'TEST_Op02';
  SELECT p.id INTO v_helper3_id FROM persone p WHERE p.nome = 'TEST_Op03';
  SELECT p.id INTO v_helper4_id FROM persone p WHERE p.nome = 'TEST_Op04';
  SELECT p.id INTO v_helper5_id FROM persone p WHERE p.nome = 'TEST_Op05';
  SELECT p.id INTO v_helper6_id FROM persone p WHERE p.nome = 'TEST_Op06';
  
  -- Centro Costo IDs
  SELECT id INTO v_cc_pip001_id FROM centri_costo WHERE codice = 'CC-PIP-001' AND progetto_id = v_progetto_id;
  SELECT id INTO v_cc_pip002_id FROM centri_costo WHERE codice = 'CC-PIP-002' AND progetto_id = v_progetto_id;
  SELECT id INTO v_cc_eqp001_id FROM centri_costo WHERE codice = 'CC-EQP-001' AND progetto_id = v_progetto_id;
  SELECT id INTO v_cc_ele001_id FROM centri_costo WHERE codice = 'CC-ELE-001' AND progetto_id = v_progetto_id;

  IF v_foreman_marco_id IS NULL THEN
    RAISE NOTICE 'Foreman non trovati. Esegui prima lo script dati test fittizi.';
    RETURN;
  END IF;

  -- ============================================================
  -- RAPPORTINI ULTIMI 5 GIORNI LAVORATIVI
  -- ============================================================
  
  -- Giorno 1: Lunedì scorso
  v_data := CURRENT_DATE - INTERVAL '7 days';
  
  -- Rapportino Piping HP
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_marco_id, v_progetto_id, v_cc_pip001_id, v_data, 
    'Prefabbricazione linee HP da 6" a 8". Completate 3 isometrie.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper1_id, 10, 0, 'presente'),
  (v_rapportino_id, v_helper2_id, 10, 2, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_pip001_id, v_foreman_marco_id, v_data, 85, 'Pollici saldati prefab');

  -- Rapportino Elettrico
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_paolo_id, v_progetto_id, v_cc_ele001_id, v_data, 
    'Posa cavi MT rack Nord. Terminazioni quadro QE-01.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper3_id, 10, 0, 'presente'),
  (v_rapportino_id, v_helper4_id, 10, 0, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_ele001_id, v_foreman_paolo_id, v_data, 320, 'Metri cavo MT posati');

  -- Giorno 2: Martedì
  v_data := CURRENT_DATE - INTERVAL '6 days';
  
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_marco_id, v_progetto_id, v_cc_pip001_id, v_data, 
    'Montaggio linee HP area compressori. Supporteria.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper1_id, 10, 2, 'presente'),
  (v_rapportino_id, v_helper2_id, 10, 2, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_pip001_id, v_foreman_marco_id, v_data, 62, 'Pollici montati');

  -- Equipment
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_andrea_id, v_progetto_id, v_cc_eqp001_id, v_data, 
    'Posizionamento compressore K-101. Allineamento.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper5_id, 10, 4, 'presente'),
  (v_rapportino_id, v_helper6_id, 10, 4, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, quantita_secondaria_fatta, note)
  VALUES (v_cc_eqp001_id, v_foreman_andrea_id, v_data, 1, 45, '1 compressore - 45 ton');

  -- Giorno 3: Mercoledì
  v_data := CURRENT_DATE - INTERVAL '5 days';
  
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_marco_id, v_progetto_id, v_cc_pip001_id, v_data, 
    'Saldature linee HP. Controlli NDT.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper1_id, 10, 0, 'presente'),
  (v_rapportino_id, v_helper2_id, 8, 0, 'permesso');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_pip001_id, v_foreman_marco_id, v_data, 48, 'Pollici saldati');

  -- Utilities
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_marco_id, v_progetto_id, v_cc_pip002_id, v_data, 
    'Linee aria compressa da 2". Prefab e montaggio.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper1_id, 0, 0, 'presente'),
  (v_rapportino_id, v_helper2_id, 0, 0, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_pip002_id, v_foreman_marco_id, v_data, 35, 'Pollici utilities');

  -- Giorno 4: Giovedì
  v_data := CURRENT_DATE - INTERVAL '4 days';
  
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_marco_id, v_progetto_id, v_cc_pip001_id, v_data, 
    'Completamento saldature rack principale.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper1_id, 10, 2, 'presente'),
  (v_rapportino_id, v_helper2_id, 10, 2, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_pip001_id, v_foreman_marco_id, v_data, 72, 'Pollici saldati');

  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_paolo_id, v_progetto_id, v_cc_ele001_id, v_data, 
    'Posa cavi BT e segnale. Cablaggio quadri.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper3_id, 10, 0, 'presente'),
  (v_rapportino_id, v_helper4_id, 10, 2, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_ele001_id, v_foreman_paolo_id, v_data, 485, 'Metri cavo BT/segnale');

  -- Giorno 5: Venerdì
  v_data := CURRENT_DATE - INTERVAL '3 days';
  
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_marco_id, v_progetto_id, v_cc_pip001_id, v_data, 
    'Tie-in linee esistenti. Test tenuta.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper1_id, 10, 0, 'presente'),
  (v_rapportino_id, v_helper2_id, 10, 0, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_pip001_id, v_foreman_marco_id, v_data, 38, 'Pollici tie-in');

  -- Equipment - secondo compressore
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_andrea_id, v_progetto_id, v_cc_eqp001_id, v_data, 
    'Posizionamento compressore K-102. Grouting.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper5_id, 10, 2, 'presente'),
  (v_rapportino_id, v_helper6_id, 10, 2, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, quantita_secondaria_fatta, note)
  VALUES (v_cc_eqp001_id, v_foreman_andrea_id, v_data, 1, 48, '1 compressore - 48 ton');

  -- Giorno 6: Sabato (mezza giornata)
  v_data := CURRENT_DATE - INTERVAL '2 days';
  
  INSERT INTO rapportini (foreman_persona_id, progetto_id, centro_costo_id, data, descrizione_attivita, stato, firmato)
  VALUES (v_foreman_marco_id, v_progetto_id, v_cc_pip001_id, v_data, 
    'Completamento prefab settimanale.', 'approvato', true)
  RETURNING id INTO v_rapportino_id;
  
  INSERT INTO ore_lavorate (rapportino_id, persona_id, ore_ordinarie, ore_straordinario, tipo_presenza) VALUES
  (v_rapportino_id, v_helper1_id, 6, 0, 'presente'),
  (v_rapportino_id, v_helper2_id, 6, 0, 'presente');
  
  INSERT INTO progress_fisico (centro_costo_id, inserito_da_persona_id, data, quantita_fatta, note)
  VALUES (v_cc_pip001_id, v_foreman_marco_id, v_data, 28, 'Pollici prefab sabato');

  -- ============================================================
  -- PRESENZE (ultimi giorni)
  -- ============================================================
  
  -- Inserisci presenze per tutti i lavoratori test
  FOR v_data IN 
    SELECT generate_series(CURRENT_DATE - INTERVAL '7 days', CURRENT_DATE - INTERVAL '1 day', '1 day')::date
  LOOP
    -- Solo giorni lavorativi (no domenica)
    IF EXTRACT(DOW FROM v_data) != 0 THEN
      INSERT INTO presenze (persona_id, progetto_id, data, ora_checkin, ora_checkout, lat_checkin, lng_checkin)
      SELECT 
        p.id, 
        v_progetto_id, 
        v_data, 
        '07:00'::time, 
        CASE WHEN EXTRACT(DOW FROM v_data) = 6 THEN '13:00'::time ELSE '17:00'::time END,
        44.7857 + (random() * 0.001 - 0.0005),
        10.3081 + (random() * 0.001 - 0.0005)
      FROM persone p
      WHERE p.nome LIKE 'TEST_%'
      ON CONFLICT (persona_id, progetto_id, data) DO NOTHING;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Dati realistici creati!';
  RAISE NOTICE 'Rapportini: ~12';
  RAISE NOTICE 'Ore lavorate: ~24 record';
  RAISE NOTICE 'Progress fisico: ~12 record';
  RAISE NOTICE 'Presenze: ~6 giorni x 6 persone';

END $$;

-- ============================================================
-- VERIFICA DATI CREATI
-- ============================================================

-- Riepilogo ore per centro costo
SELECT 
  cc.codice,
  cc.nome,
  cc.budget_ore,
  COALESCE(SUM(ol.ore_ordinarie + ol.ore_straordinario), 0) as ore_spese,
  ROUND(COALESCE(SUM(ol.ore_ordinarie + ol.ore_straordinario), 0) / NULLIF(cc.budget_ore, 0) * 100, 1) as perc_ore
FROM centri_costo cc
LEFT JOIN rapportini r ON r.centro_costo_id = cc.id
LEFT JOIN ore_lavorate ol ON ol.rapportino_id = r.id
WHERE cc.progetto_id = (SELECT id FROM progetti WHERE codice = 'PRJ-PARMA-001')
GROUP BY cc.id, cc.codice, cc.nome, cc.budget_ore
ORDER BY cc.codice;

-- Riepilogo progress fisico
SELECT 
  cc.codice,
  cc.nome,
  cc.budget_quantita,
  um.simbolo as udm,
  COALESCE(SUM(pf.quantita_fatta), 0) as quantita_fatta,
  ROUND(COALESCE(SUM(pf.quantita_fatta), 0) / NULLIF(cc.budget_quantita, 0) * 100, 1) as perc_avanzamento
FROM centri_costo cc
LEFT JOIN unita_misura um ON um.id = cc.unita_misura_id
LEFT JOIN progress_fisico pf ON pf.centro_costo_id = cc.id
WHERE cc.progetto_id = (SELECT id FROM progetti WHERE codice = 'PRJ-PARMA-001')
GROUP BY cc.id, cc.codice, cc.nome, cc.budget_quantita, um.simbolo
ORDER BY cc.codice;
