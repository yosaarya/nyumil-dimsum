-- db/migrations/005_jaga_status_security_definer.sql
-- Perbaikan: trigger jaga_status_pesanan() menulis ke pesanan_log, tapi
-- pesanan_log tidak punya policy INSERT untuk siapa pun (sengaja, lihat
-- 003_rls.sql). Tanpa SECURITY DEFINER, insert itu akan ditolak RLS begitu
-- ada yang mengubah status pesanan (mis. tab Dapur menandai "Siap").
-- Jadikan fungsinya SECURITY DEFINER, sama seperti buat_pesanan() dan
-- catat_produksi().

create or replace function jaga_status_pesanan()
returns trigger
language plpgsql
security definer
as $$
declare v_belum int;
begin
  if new.status = old.status then return new; end if;

  if not (
      (old.status = 'DRAFT'        and new.status in ('DIKONFIRMASI','BATAL'))
   or (old.status = 'DIKONFIRMASI' and new.status in ('DIBUAT','BATAL'))
   or (old.status = 'DIBUAT'       and new.status in ('SIAP','BATAL'))
   or (old.status = 'SIAP'         and new.status in ('SELESAI','BATAL'))
  ) then
    raise exception 'Perpindahan status tidak diizinkan: % -> %', old.status, new.status;
  end if;

  if new.status = 'DIBUAT' and old.kanal = 'WA' and not new.dikonfirmasi_pelanggan then
    raise exception 'Pesanan WA belum dikonfirmasi pelanggan';
  end if;

  if new.status = 'SIAP' then
    select count(*) into v_belum
      from pesanan_item where pesanan_id = new.id and not selesai_dibuat;
    if v_belum > 0 then
      raise exception 'Masih ada % item belum selesai dibuat', v_belum;
    end if;
  end if;

  if new.status = 'SELESAI' and not new.lunas and not new.kasbon then
    raise exception 'Pesanan belum lunas dan tidak ditandai kasbon';
  end if;

  insert into pesanan_log (pesanan_id, kejadian, dari_status, ke_status, alasan, oleh)
  values (new.id, 'UBAH_STATUS', old.status, new.status, new.alasan_batal, auth.uid());

  return new;
end $$;
