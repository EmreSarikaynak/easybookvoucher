-- =========================================================================
-- BACKFILL: Eski Biletler İçin Acente Borç Güncellemesi
--
-- Sorun: Bilet kesilirken "agent_owes_easybook_eur" trigger'ı bugün eklendiği için,
-- DÜNDEN veya DAHA ÖNCEDEN kesilmiş biletlerin EasyBook borç sütunu 0 (sıfır) olarak kaldı.
-- Ortak Raporlar sayfasında verilerin eksik/hatalı görünmesinin sebebi budur.
-- =========================================================================

DO $$
DECLARE
    v record;
    v_adult_price numeric;
    v_child_price numeric;
    v_calc_debt numeric;
BEGIN
    -- 'cancelled' OLMAYAN tüm biletleri döngüye al
    FOR v IN 
        SELECT vch.id, vch.tour_id, vch.pax_adult, vch.pax_child, vch.agent_owes_easybook_eur 
        FROM vouchers vch
        WHERE vch.status != 'cancelled'
    LOOP
        -- Eğer biletin bir turu varsa, turun fiyatlarını bul
        IF v.tour_id IS NOT NULL THEN
            SELECT base_price_adult_eur, base_price_child_eur 
            INTO v_adult_price, v_child_price
            FROM tours 
            WHERE id = v.tour_id;
            
            -- pax_adult boşsa 1 sayalım, pax_child boşsa 0 sayalım
            v_calc_debt := (COALESCE(v.pax_adult, 1) * COALESCE(v_adult_price, 0)) + 
                           (COALESCE(v.pax_child, 0) * COALESCE(v_child_price, 0));
            
            -- Sadece 0 olanları veya hesaplanan borçla eşleşmeyenleri güncelleyelim
            IF COALESCE(v.agent_owes_easybook_eur, 0) != v_calc_debt THEN
                UPDATE vouchers 
                SET agent_owes_easybook_eur = v_calc_debt
                WHERE id = v.id;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Eski biletlerin acente borç değerleri (agent_owes_easybook_eur) başarıyla güncellendi!';
END $$;
