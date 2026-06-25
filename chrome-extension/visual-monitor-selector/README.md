# Visual Monitor Selector Extension

Bu Chrome extension Change Monitor üçün real brauzer tabında CSS selector seçməyə imkan verir.

## Quraşdırma

1. Chrome-da `chrome://extensions` aç.
2. `Developer mode` aktiv et.
3. `Load unpacked` kliklə.
4. Bu qovluğu seç:
   `chrome-extension/visual-monitor-selector`
5. Əgər extension artıq yüklənibsə, `Reload` düyməsini bas.

## İstifadə

1. Admin paneldə `/admin/change-monitor` açıq olsun.
2. Yeni izləmə formunda URL yaz.
3. `Brauzerdə aç` düyməsi ilə saytı aç.
4. Açılan saytda sağ altda `Visual Monitor` paneli görünməlidir.
5. Panel görünmürsə, Chrome toolbar-da Visual Monitor extension iconuna kliklə.
6. `Selector seç` kliklə.
7. İzlənəcək hissəyə kliklə.
8. Sağ altdakı paneldə `Yadda saxla` kliklə.
9. Admin panel açıqdırsa, seçim avtomatik `İzləmələr` siyahısına əlavə ediləcək.

## Qeyd

Bu extension discovery etmir və özü bazaya yazmır. Seçilən selectoru Chrome storage üzərindən admin panelə ötürür; admin panel açıqdırsa, mövcud sessiya ilə yeni izləmə avtomatik yaradılır.

