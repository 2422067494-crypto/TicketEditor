/*!
 * 144 位铁路车票二维码解码器 —— libJNIEncrypt.so 算法复刻（零依赖）
 * 用法：
 *   const t = TicketQR.decode(code144, 2025);
 *   console.log(t.train, t.date, t.name);
 * 浏览器：<script src="ticket.js"></script> 后直接用 TicketQR.decode
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TicketQR = factory();
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var B64 = 'MDEwMDAxMTEwMTAwMDExMDExMDEwMDAwMDEwMTEwMTAwMTAwMTEwMDAwMTAxMTAwMDAxMDEwMTAxMTAxMTAwMDAwMDAwMDAwMTAwMTEwMDAwMDAxMDEwMDAxMDAxMTEwMDAxMDEwMDAwMDAxMDExMTExMDAwMTExMTExMTExMTAAMTAwMTAxMTExMDExMTEwMTExMDAwMDExMDExMTAwMDAwMDEwMDAwMTEwMDAwMTAxMTAwMTAxMDEwMTExMTAwMTExMDAwMDAxMTEwMDExMDExMDEwMDAxMTAxMDAwMDEwMDExMDAxMTEwMDExMTAwMDEwMTAwMDEwMTEwMTAwMDEAMDEwMDAxMTEwMDEwMTExMTAxMTExMTEwMDAwMTEwMDEwMTAxMTAxMTAwMTAxMTAxMTAwMTExMTExMDEwMTExMDAxMDAxMTExMDAxMTAwMDEwMDAwMDExMDExMTEwMTAxMDEwMDAwMDEwMTExMDEwMTExMDEwMTAwMTAwMDAwMTAAMDAwMDAxMTEwMDEwMDAxMTAxMDAwMDAxMTAxMDEwMTAwMTAxMTExMDExMTExMDAxMDAxMTAxMDEwMDExMDExMDExMTExMTEwMDExMTAxMDEwMDExMTAwMDExMTAwMTAwMDExMTAxMTAxMDExMTAwMTAwMDExMDAxMTAwMTAxMTEAMTExMDAwMDExMDExMDExMDEwMDAxMTAwMDAwMDAxMDAxMDAwMDAxMDEwMTEwMTExMDExMDEwMDExMDAxMTExMTAxMDEwMTAwMTExMTExMTAwMDAwMDEwMDAxMTAwMDAxMTEwMDEwMDAxMTEwMTAwMDExMTExMTAwMTExMTAxMTEAMDAwMDExMDEwMDExMDAxMTAxMTAxMDAwMTAwMDEwMDAwMDEwMTAxMDAxMTAxMTAxMDEwMDExMDAxMDAxMDEwMDAxMDExMTAxMDExMTEwMTEwMDAwMTAwMDExMTAwMDAwMTAxMTExMTExMTAwMTAxMDAxMTAxMDExMTAwMDAwMTEAMDAxMDEwMDAxMDExMTAwMTEwMDExMDAwMDEwMTAwMDEwMTExMDAwMTAxMDExMTExMTAwMTEwMDAxMDAwMTExMTAwMTAwMDAxMTEwMTEwMDAwMDAxMTExMTAwMTAxMTEwMDAxMDEwMTAxMTEwMDAwMDEwMDEwMDAxMDExMTAxMTAAMDAwMDAwMDAwMDAwMTAwMDEwMTEwMDAwMTEwMDAxMTAwMTAwMTAxMTEwMTAwMDEwMDAwMDAwMDAwMDExMTEwMDAxMTAxMDAxMTAwMTEwMTEwMTExMDEwMDExMTEwMDAxMDExMTAwMTExMDAxMDAxMTAxMTEwMTEwMDExMDEwMDAAMDEwMDExMTAxMTAxMDAwMTAwMDEwMTAxMTAxMDAxMDExMTAxMDAxMDExMTExMTEwMDAwMTEwMTExMTExMDAxMTAxMDExMDExMTAxMTAwMTEwMDExMDEwMTExMDAxMDAwMDExMDExMTAwMDExMDExMTAwMTExMTExMTExMDEwMDEAMTAxMTAxMDAxMTAxMDExMDEwMTExMDAwMTExMTAxMTExMDAwMDAwMTAwMDExMDAwMDAwMTAxMTAxMDAxMTAwMTAwMTAwMDExMTAxMTAxMTAwMDAxMDAxMDAwMDAwMDEwMTAwMDEwMDAxMDAxMDAxMTAwMTEwMDEwMTExMTExMTEAMDExMDAxMDExMDAwMTAxMTEwMDAxMDAwMDEwMTAxMDEwMDAxMDExMTEwMDEwMTEwMTExMTExMDExMTAwMTAwMTExMTAxMTEwMTExMTAwMDExMDExMDEwMTAwMTEwMTExMDEwMDAxMTAxMTAxMDAwMTExMTEwMTAwMDEwMTEwMDEAMTAxMDAxMDExMDEwMTAwMDEwMDAwMDAwMTExMDEwMTExMTEwMDAwMTEwMTExMTAwMTEwMDEwMDAxMTEwMTAxMTAxMDAwMDAwMTExMDAwMDExMTExMDEwMDAwMDEwMDExMDAwMTAxMDAxMTExMTAxMTEwMTExMTAxMTAwMTAwMTEAMDAwMTExMTExMDExMDEwMDEwMDAwMTAwMDExMTAxMDExMDAwMTEwMDEwMDAwMTExMDExMTAwMTAxMDAxMTAwMDExMDEwMDExMDExMTExMDEwMDEwMTAxMDEwMDExMDAxMDExMTAxMDAwMDAwMTAwMTExMTExMTAwMTExMTAxMTAAMDAwMTEwMDAwMTEwMDAxMTExMDExMTAwMDEwMTEwMDExMTExMTAwMTExMTExMDAwMDExMDAxMDExMTAwMDExMTEwMDAwMDEwMDAxMTAxMDExMDAwMTEwMTAxMDAxMTAxMTAxMTEwMDExMDAwMDAxMTEwMDExMDAxMTExMDEwMTEAMDAxMDEwMDAxMDEwMDAwMDAxMDAwMDEwMTAxMDAxMDAwMTExMTExMTExMDExMDExMDAwMDExMTEwMDExMDExMTAxMTExMDAxMTExMTAwMTAwMDAxMDExMTAwMDExMTEwMTEwMTExMTExMDAwMTAxMDAwMDExMTExMDExMTAwMTAAMTExMDAwMDExMDExMDEwMDAxMDAxMDEwMDExMDAwMDAxMDAxMDExMDEwMTAwMDAxMDAxMDEwMTAxMDAxMDEwMTEwMDAwMTAxMTAxMTAxMDEwMTExMTEwMTAxMTEwMTExMTAxMDEwMDExMDExMDAwMDAxMTExMDAxMTAwMDAwMDEAMDAwMDEwMDEwMTEwMDAxMTAxMDAxMDAwMTAwMTExMDEwMDEwMDEwMDEwMDExMDExMDEwMDEwMTAxMDEwMDEwMDEwMDExMTEwMDAwMDExMDAwMDAwMDAxMDExMTAxMTAxMTExMDAwMDEwMTExMTEwMDEwMDEwMDExMTAxMTEwMTAAMDAxMDExMDEwMDEwMDExMTAxMTAxMDAwMDAxMTEwMDAxMDEwMDAwMTAxMTAwMDAwMTAwMTAxMTEwMTExMTEwMDEwMTAxMTAxMDAxMDAxMDExMDEwMDEwMDExMTEwMTExMDExMTExMDAwMTExMDExMTAxMTEwMDExMTAxMDExMTEAMDEwMDAxMDAxMDExMDAxMTEwMDExMDExMDExMTExMDEwMTAxMDEwMDExMDExMDEwMDExMDEwMDAwMDEwMTExMDExMDExMDAxMDExMDExMDAwMTAwMTEwMDExMTAwMDExMDEwMTEwMTAxMTExMTEwMDEwMTAwMDExMDAwMDExMDEAMDAwMTExMTEwMDAwMTEwMDAxMDEwMTEwMTEwMTEwMDExMDAwMTAwMTExMDEwMTAwMDExMDEwMTAwMTExMTAwMDExMDAwMDEwMTAwMTExMTAwMTEwMTExMDAxMDExMDExMDEwMDAxMDAwMDExMDAxMDExMTAxMTAwMTExMTAwMDEAMDExMDAwMTAwMDEwMDEwMTAwMTAwMTAxMTAwMDAxMDExMTAxMTAwMDExMDExMDExMTAxMDAxMDAwMDAxMDExMDEwMTExMTExMTAxMTAwMDAxMDAwMTExMTAwMDExMDAxMTEwMTAxMDAwMTEwMDExMDAwMTEwMDAwMDExMTExMDAAMDAxMTAxMDExMTAxMDAxMTAxMTAxMTExMTAwMDExMTAxMTEwMTAwMDAwMDAwMTExMDAxMTAwMTExMTAxMTExMDAwMTAxMTExMDExMDEwMTAwMTExMTAwMDAxMTEwMTExMDAxMDExMTAwMDEwMDAwMTAxMDAwMDExMTAwMTAxMTAAMTAwMTAxMTAxMDAxMDAxMDExMTAxMDAwMDEwMTEwMDAxMDAxMDAxMTAwMTAwMTExMTAxMTEwMTExMDEwMTExMTAxMTAwMTExMTEwMDEwMDExMTEwMTAxMTAwMTAwMDEwMTAxMTExMDAxMTAwMTAxMTEwMTAwMDEwMDAxMTExMDEAMTAwMDAwMDEwMTEwMTEwMTExMDEwMTAwMTEwMDEwMDAwMDAwMDEwMTExMDEwMTEwMTAwMTAwMDEwMDAwMTExMTAxMTEwMDAxMTAwMDAxMDExMDAxMTEwMDAwMDExMDAwMTAxMTAxMTAxMTExMDAwMTExMDExMTExMTEwMDExMTEAMTAwMTAxMTExMTAxMTEwMTAxMTEwMDAwMTExMDAxMDEwMDExMDAxMTAwMDExMTAxMTExMDAxMTAxMDAwMTAwMDAxMTAxMTAwMTAwMDAxMTEwMTExMDEwMDExMTEwMTAxMTAxMTAwMTAxMDExMDExMDAwMDAxMDAxMTEwMDAxMDAAMTAwMTAxMTExMTAxMTEwMTAxMTEwMDAwMTExMDAxMDEwMDExMDAxMTAwMDExMTAxMTExMDAxMTAxMDAwMTAwMDAxMTAxMTAwMTAwMDAxMTEwMTExMDEwMDExMTEwMTAxMTAxMTAwMTAxMDExMDExMDAwMDAxMDAxMTEwMDAxMDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMTExMDAwMDExMDExMDExMDEwMDAxMTAwMDAwMDEwMDEwMDAwMDEwMTExMTAxMDAxMDEwMTAxMDAxMTAwMTExMTEwMTAwMTExMTExMTAwMDExMDExMTAxMDEwMDAxMTAwMDAxMTEwMDEwMDAwMDAwMTExMTExMDAxMTExMDExMTAAMDAxMDExMDEwMDEwMDExMTAxMTAxMDAwMDExMTAwMDEwMTAwMDEwMTEwMTAwMTAxMTAxMTExMTAwMDEwMDEwMTEwMDAwMDEwMDEwMTExMDExMTAxMTExMDExMTAwMTAxMDExMDEwMDEwMTEwMTExMDExMTAwMTExMDEwMTExMTAAMDAwMDAwMDAwMDAwMTAwMDEwMTEwMDAxMTAwMDExMDAxMDAxMDExMTAxMDAwMTAwMDAwMDAwMDAwMTExMTAwMDExMDEwMDExMDAxMTAxMTAxMTEwMTAwMTExMTAwMDEwMTExMDAxMTEwMDEwMDExMDExMTAxMTAwMTEwMTAwMDAAMDEwMDExMTAxMTAxMDAwMTAwMDEwMDExMDEwMDEwMTExMTEwMTExMDExMDAxMTAwMTAwMTAxMTAwMDAxMTAxMTExMTEwMDExMDEwMDExMDEwMTExMDAxMDAwMDExMTExMTEwMTExMDAwMTEwMTExMDAxMTExMTExMTEwMTAwMTAAMDEwMDAxMTEwMDEwMTExMTAxMTExMTEwMDAxMTAwMTAxMDExMDExMDAxMDExMDExMDAxMTExMTEwMTAxMTEwMDEwMDExMTEwMDExMDAwMTAwMDAwMTEwMTExMTAxMDEwMTAwMDAwMTAxMTEwMTAxMTEwMTAxMDAxMDAwMDAxMDEAMDAwMDAxMTEwMDEwMDAxMTAxMDAwMDAxMTAxMDEwMTAxMDExMTEwMTAxMTEwMTAxMDAxMDAxMTAxMTExMTExMDAxMTAxMDAxMTAxMDEwMDExMTExMTAwMDExMTAwMTAwMTExMDExMDEwMTExMDAxMDAwMTEwMDExMDAxMDExMTAAMDAwMTExMTExMDExMDEwMDEwMDAwMTAwMDExMTAxMDExMDAwMTEwMDEwMDAwMTExMDExMDExMTAxMTAwMDExMDEwMTEwMTExMDEwMDEwMTAxMDEwMDExMDAxMDEwMTExMDAxMDEwMDAwMDAwMTAwMTExMTExMDAxMTExMDExMDEAMDExMDAwMTAwMDEwMDEwMTAwMTAwMTAxMTAwMDAxMDExMTAxMDAwMTEwMTEwMTExMDEwMDEwMDAwMDEwMTEwMTAxMTExMTExMDExMDAwMDEwMDAxMTExMDAwMTEwMDExMTAxMDEwMDAxMTAwMTEwMDAxMTAwMDAwMTExMTEwMDEAMTAxMTAxMDAxMTAxMDExMDEwMTExMDAwMTExMTAxMTExMDAwMDAwMTEwMDAwMTAxMDAwMTAwMDEwMDAwMDAxMDEwMDExMDAxMDAxMDAwMDAwMDEwMTEwMTAwMTAwMDAwMTExMDExMDExMDEwMDExMDAxMTAwMTAxMTExMTExMTAAMTAwMTAxMTAxMDAxMDAxMDExMTAxMDAwMDEwMTEwMDAxMDAwMDExMDAxMDAxMTExMDExMTAxMTEwMTAxMTExMDExMDAxMTExMTAwMTAwMTExMTAxMDExMDAxMDAwMTAxMDExMTEwMDExMDAxMDExMTAxMDAwMTAwMDExMTEwMTEAMTAwMDAwMDEwMTEwMTEwMTExMDEwMTAwMTEwMDEwMDAwMDAwMTAxMTEwMTAxMTAxMDAxMDAwMTAwMDAxMTExMDExMTAwMDExMDAwMDEwMTEwMDExMTAwMDAwMTEwMDAxMDExMDExMDExMTEwMDAxMTEwMTExMTExMTAwMTExMTAAMDAxMTAxMDExMTAxMDAxMTAxMTAxMTExMTAwMDExMTAxMTEwMTAwMDAwMDAxMTEwMDExMDEwMTEwMTAxMDAxMTExMDAwMDExMTAxMTEwMDEwMTExMDAwMTAwMTExMTAxMTExMDAwMTAxMTEwMDAxMDEwMDAwMTExMDAxMDExMDEAMDEwMDAxMTEwMTAwMDExMDExMDEwMDAwMDEwMTEwMTAwMTAwMTEwMDAwMTAxMTAwMDAxMDEwMTAxMTAxMTAwMDAwMDAwMDAxMDAxMTAwMDAwMDEwMTAwMDExMDEwMDAwMDAxMDExMTExMDAwMTExMTExMTEwMDExMTAwMDExMDEAMDAwMDExMDEwMDExMDAxMTAxMTAxMDAwMTAwMDEwMDAwMDEwMTAxMDAxMTAxMTEwMTAwMTEwMDEwMDEwMTAwMDEwMTExMDEwMTExMTAxMTAwMDAxMDAwMTExMDAwMDAxMDExMTExMTExMDAxMDEwMDExMDEwMTExMDAwMDAxMTEAMDAxMDEwMDAxMDExMTAwMTEwMDExMDAwMDEwMTAwMDEwMDAwMTExMTAwMTAwMDExMTAxMTEwMDAxMTAwMDAwMDExMTExMDAxMDExMTAwMDExMDAwMTAxMDExMTExMTAwMTEwMTAxMDExMTAwMDAwMTAwMTAwMDEwMTExMDExMDEAMTAxMDAxMDExMDEwMTAwMDEwMDAwMDAwMTExMDEwMTExMTEwMDAwMTEwMTExMDEwMTEwMTAwMDAwMDExMTAwMDAxMTEwMTExMTAwMTEwMDEwMDExMDEwMDAwMDEwMDExMDAwMTAxMDAxMTExMTAxMTEwMTExMTAxMDAxMDAxMTAAMDAwMTEwMDAwMTEwMDAxMTExMDExMTAwMDEwMTEwMDExMTExMTAwMTExMTExMDAwMDExMDAxMDExMTAwMDExMTEwMDAwMTAwMDExMDEwMTEwMDAxMTAxMDEwMDExMDExMDExMTAwMTEwMDAwMDExMTAwMTEwMDExMTEwMTAxMTAAMDEwMDAxMDAxMDExMDAxMTEwMDExMDExMDExMTExMDEwMTAxMDEwMDExMDExMDEwMDExMDEwMDAwMDEwMTExMDExMDExMDAxMDExMDExMDAwMTAwMTExMTExMDAxMDEwMDAxMTAxMTAwMTExMDAwMTEwMTAxMTAxMDAwMTEwMTAAMDAwMTExMTEwMDAwMTEwMDAxMDEwMTEwMTEwMTEwMTAxMDAxMTExMDAxMTAxMTEwMDEwMTEwMTEwMTAwMDAxMTAwMTAwMTExMDEwMTAwMDExMDEwMTAwMTExMTAwMDExMDAwMDEwMDAwMTEwMDEwMTExMDExMDAxMTExMDAwMTAAMDExMDAxMDExMDAwMTAxMTEwMDAxMDAwMDEwMTAxMDEwMDAxMDExMTEwMDEwMTEwMTExMTExMDExMTAwMDAxMTExMDExMTAxMTExMDAwMTEwMTEwMTAxMTEwMTAwMDExMDExMDEwMDAxMTExMTAwMTAwMTExMDAwMTAxMTAwMTAAMTAwMTAxMTExMDExMTEwMTExMDAwMDExMDExMTAwMDAwMDEwMDAwMTEwMDAwMTAxMTAwMTAxMDEwMTExMTAwMTExMDAwMDAxMTEwMDEwMDExMDAxMTEwMDExMTAwMDEwMTAwMDEwMTEwMTAxMTAxMTAxMDAwMTEwMTAwMDAwMTAAMDAxMDEwMDAxMDEwMDAwMDAxMDAwMDEwMTAxMDAxMDExMDExMDAwMDExMTEwMDExMDExMTAxMTExMDExMDExMDExMTExMTAwMDEwMTAxMTExMDAwMTExMTExMTExMDAxMDAwMDEwMTExMDAwMTExMDAwMTExMTEwMTExMDAxMDEAMTExMDAwMDExMDExMDEwMDAxMDAxMDEwMDExMDAwMDAxMDAxMDExMDEwMTAwMDAxMDAxMDEwMTEwMDEwMTAxMTAwMDAxMDExMDExMDEwMTAxMTExMTAxMDExMTAxMTExMDEwMTAwMTEwMTEwMDAwMDExMTEwMDExMDAwMDAwMTAAMDAwMDEwMDEwMTEwMDAxMTAxMDAxMDAxMDAxMTEwMTAwMTAwMTAwMTEwMDEwMTAxMDEwMDEwMDEwMDExMTEwMDAwMDExMDAwMDAwMDAxMDExMTAxMTAxMTAwMTEwMTEwMTEwMDAwMTAxMTExMTAwMTAwMTAwMTExMDExMTAxMDEAMTAwMTAxMTExMTEwMTAxMTAxMTEwMTExMDEwMTExMTEwMTAxMTAwMDEwMDAwMTExMDAxMDEwMTAwMDExMTAwMTEwMTAwMDExMTEwMDEwMTEwMDExMDAxMDAwMDExMTAxMTAxMDAxMDEwMTEwMTEwMDAwMDEwMDExMTAwMDEwMDEAMTAwMTAxMTExMTAxMTExMTAxMTEwMTExMDEwMDExMDAwMTExMDEwMTExMDExMTEwMTAxMDAxMDEwMDEwMTEwMTAwMDAxMTAwMDExMDExMTAwMTEwMTEwMTEwMTAwMDAwMTExMDAwMTAxMTAwMDEwMTAwMDAxMDAwMDEwMTEwMDEAIQAAABYAAAAHAAAAKgAAACgAAAAgAAAAOAAAAB8AAAArAAAAAgAAAAQAAAAwAAAACgAAAAMAAAAaAAAAEQAAADEAAAAXAAAAGwAAADQAAAA9AAAAEwAAACMAAAA1AAAAOQAAABgAAAA8AAAAGQAAAD8AAAApAAAAJQAAADMAAAABAAAABgAAAA0AAAAnAAAACQAAADcAAAA2AAAAHQAAAA8AAAAvAAAALgAAAD4AAAAtAAAAJAAAABIAAAAQAAAAFQAAADIAAAAmAAAAOwAAADoAAAAsAAAAFAAAACIAAAAMAAAACwAAAAAAAAAOAAAABQAAAAgAAAAcAAAAHgAAAEsAAAAMAAAAWAAAACIAAAAZAAAAPwAAACkAAABaAAAAGgAAAC4AAABjAAAAIwAAAGYAAABDAAAAEAAAAF0AAABnAAAANgAAAD4AAAAAAAAARgAAABUAAABKAAAABwAAACoAAABRAAAACAAAAGIAAAASAAAAOwAAAHMAAAAyAAAALAAAAFcAAAAYAAAAIAAAAGwAAABQAAAALQAAAGsAAABEAAAAAwAAAHAAAAAvAAAAVAAAABMAAABSAAAAJAAAAHUAAABeAAAAfgAAACgAAAAWAAAAbwAAAA4AAABOAAAADwAAAGEAAAAlAAAAOgAAAHEAAAA5AAAAdAAAAGQAAAA9AAAADQAAAGoAAAA8AAAAagAAAAYAAABZAAAAdwAAADEAAAB4AAAANQAAAEkAAAAJAAAAHAAAABEAAAAvAAAAIQAAAGAAAABHAAAAAgAAAB8AAABfAAAARQAAAAEAAABNAAAAHgAAAGUAAAAbAAAAXAAAADgAAABTAAAAcgAAAGgAAABWAAAAJwAAAFUAAABBAAAAdgAAACYAAAB8AAAAQAAAAHkAAAAKAAAAfQAAAEgAAAAEAAAAegAAADcAAAAXAAAATAAAAAUAAABuAAAAMwAAABQAAAB/AAAACwAAAHsAAAA0AAAATwAAAFsAAAArAAAAbQAAAEIAAAAdAAAAAAAAACAAAAAHAAAAAwAAABoAAACoRAAAAAAAAAAAAAAAAAAAIAAAAAoAAAADAAAAGgAAAKhEAAAAAAAAAAAAAAAAAAAgAAAAQAAAAAIAAAAKAAAADAAAAAAAAAAAAAAAIAAAACAAAAANAAAAAwAAABoAAACoRAAAAAAAAAAAAAAgAAAAIAAAABAAAAADAAAAGwAAAONMAAAAAAAAAAAAACAAAAAgAAAAKgAAAAIAAAAKAAAADAAAAAAAAAAAAAAAQAAAAB8AAAAYAAAAAgAAAAoAAABAAAAAAAAAAAAAAABAAAAAHwAAABsAAAACAAAACgAAACAAAAAAAAAAAAAAAEAAAAAfAAAALgAAAAEAAAAKAAAAAgAAAAAAAAAAAAAAQAAAAB8AAAAxAAAAAQAAAAoAAAACAAAAAAAAAAAAAABAAAAAHwAAAEIAAAACAAAACgAAAB8AAAAAAAAAAAAAAEAAAAAfAAAAIQAAAAQAAAAKAAAAACAAAAAAAAAAAAAAYAAAACAAAAAyAAAABwAAAAoAAAAAAAAAAAAAAAAAAABgAAAAIAAAADkAAAABAAAACgAAAAoAAAAAAAAAAAAAAGAAAAAgAAAALAAAAAIAAAAKAAAAHwAAAAAAAAAAAAAAgAAAACAAAAATAAAABQAAAAoAAAAAAAAAAAAAAAAAAACAAAAAIAAAAB0AAAAEAAAACgAAAHEXAAAAAAAAAAAAAIAAAAAgAAAAPAAAAAQAAAAKAAAABwAAAAAAAAAAAAAAoAAAABQAAAAwAAAAAQAAAAoAAAAKAAAAAAAAAAAAAACgAAAAFAAAAC8AAAABAAAAGgAAABoAAAAAAAAAAAAAAKAAAAAUAAAAGgAAAAEAAAAKAAAAJAAAAAAAAAAAAAAAoAAAABQAAAA6AAAAAgAAAAoAAABkAAAAAAAAAAAAAAD/////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAACAAAABQAAAAQAAAAHAAAABgAAAAsAAAAKAAAADQAAAAwAAAARAAAAEAAAABMAAAASAAAAFwAAABYAAAAcAAAAHwAAAB4AAAAlAAAAJAAAACkAAAAoAAAAKwAAACoAAAAvAAAALgAAADUAAAA0AAAAOQAAADgAAAAAAAAAAwAAAAIAAAAFAAAABAAAAAcAAAAGAAAACwAAAAoAAAANAAAADAAAABEAAAAQAAAAEwAAABIAAAAXAAAAFgAAAB0AAAAcAAAAHwAAAB4AAAAlAAAAJAAAACkAAAAoAAAAKwAAACoAAAAvAAAALgAAADUAAAA0AAAAOQAAADgAAAAwMDAwMDAwMDAAAAADAAAA';

    function b64bytes(s) {
        if (typeof atob === 'function') {
            var bin = atob(s), u = new Uint8Array(bin.length);
            for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
            return u;
        }
        return new Uint8Array(Buffer.from(s, 'base64'));
    }

    var BLOB = b64bytes(B64);
    var OFF = {
        BLTE: [0, 3483], KEY2: [3483, 3354], SBOX64: [6837, 256], SBOX128: [7093, 512],
        SCHEMA: [7605, 736], PDL_STEPS: [8341, 64], PDL_INITS: [8405, 64],
        XT_STEPS: [8469, 64], XT_INITS: [8533, 64], CONST10: [8597, 16]
    };
    function raw(name) { var o = OFF[name]; return BLOB.subarray(o[0], o[0] + o[1]); }
    function ints(name) {
        var b = raw(name), n = b.length >> 2, a = new Int32Array(n);
        for (var i = 0; i < n; i++) a[i] = (b[i * 4] | b[i * 4 + 1] << 8 | b[i * 4 + 2] << 16 | b[i * 4 + 3] << 24);
        return a;
    }
    var BLTE = raw('BLTE'), KEY2 = raw('KEY2'), SBOX64 = ints('SBOX64'), SBOX128 = ints('SBOX128');
    var PDL_STEPS = ints('PDL_STEPS'), PDL_INITS = ints('PDL_INITS');
    var XT_STEPS = ints('XT_STEPS'), XT_INITS = ints('XT_INITS');
    var CONST10 = raw('CONST10');
    var SCHEMA = [];
    (function () {
        var b = raw('SCHEMA');
        for (var i = 0; i < 23; i++) {
            var e = [];
            for (var k = 0; k < 8; k++) e.push((b[i * 32 + k * 4] | b[i * 32 + k * 4 + 1] << 8 |
                b[i * 32 + k * 4 + 2] << 16 | b[i * 32 + k * 4 + 3] << 24) >>> 0);
            SCHEMA.push(e);
        }
    })();

    /* 年份锚点：二维码只存 (年-2009) mod 7，固定成常数保证同一张票结果不变 */
    var ANCHOR_YEAR = 2025;

    /* 本软件的水印：code 内 47:48 固定 Z1、"第 144 位" 固定 1。
       这三处都不参与任何票面字段（解码端不显示），所以不影响票面还原；
       固定下来即可据此判断一张票是不是本软件生成的。真票的 47/48 是随机量。 */
    var WATERMARK = { visa: 'Z', group: 1, spare: '1' };

    /* 虚拟车站：站表里查不到的名字，按名字算一个「稳定且未被占用」的三字码。
       目的：假站名也能进码，不会变成空（AAA）而把「到站 == 经由」的退票费判定带歪。
       同一名字永远得同一个码（纯哈希，不用随机数），且该码不落在任何真实电报码上。 */
    var _fakeUsed = null, _fakeMemo = Object.create(null);
    function _buildUsedCodes() {
        _fakeUsed = Object.create(null);
        var g = (typeof window !== 'undefined') ? window : {};
        var pairs = g.STATION_PAIRS || '';
        if (pairs) {
            pairs.split('|').forEach(function (p) {
                var i = p.indexOf(':');
                if (i > 0) _fakeUsed[String(p.slice(i + 1)).toUpperCase()] = 1;
            });
        }
        var arr = g.stationData;
        if (arr && arr.length) {
            for (var k = 0; k < arr.length; k++) {
                var c = String(arr[k]['电报码'] || '').replace(/^-/, '').toUpperCase();
                if (/^[A-Z]{3}$/.test(c)) _fakeUsed[c] = 1;
            }
        }
        _fakeUsed.AAA = 1;                       // AAA 是「没有站」的占位，永远不用
    }
    function fakeStationCode(name) {
        var n = String(name == null ? '' : name).trim();
        if (!n) return '';
        if (_fakeMemo[n]) return _fakeMemo[n];
        if (!_fakeUsed) _buildUsedCodes();
        var h = 5381;
        for (var i = 0; i < n.length; i++) h = ((h * 33) ^ n.charCodeAt(i)) >>> 0;
        var total = 26 * 26 * 26, start = h % total;
        for (var k = 0; k < total; k++) {        // 撞上真实电报码就往后顺延
            var v = (start + k) % total;
            var code = String.fromCharCode(65 + ((v / 676) | 0),
                                           65 + (((v / 26) | 0) % 26),
                                           65 + (v % 26));
            if (!_fakeUsed[code]) { _fakeMemo[n] = code; return code; }
        }
        return '';
    }

    var MASK180 = (1n << 180n) - 1n;

    function beBits(bits, off, n) {
        var v = 0;
        for (var i = 0; i < n; i++) v = v * 2 + bits[off + i];
        return v;
    }

    /* 55 位十进制 -> 180 位（高位在前） */
    function phchyOts(s) {
        var v = BigInt(s) & MASK180, out = new Uint8Array(180);
        for (var i = 0; i < 180; i++) out[i] = Number((v >> BigInt(179 - i)) & 1n);
        return out;
    }

    function expandKey(prefix, keyTable, index) {
        var pat = new Uint8Array(32).fill(1);
        for (var i = 0; i < 6; i++) {
            var d = (prefix[2 + i] - 0x30) & 0xff, base = 5 + 5 * i;
            for (var j = 0; j < 4; j++) pat[base - j] = (d >> j) & 1;
        }
        var p = new Uint8Array(64);
        p.set(pat, 0); p.set(pat, 32);
        var buf = new Uint8Array(128);
        buf.set(p.subarray(0, 32), 0);
        buf.set(p.subarray(7, 39), 32);
        buf.set(p.subarray(13, 45), 64);
        buf.set(p.subarray(19, 51), 96);
        var ks = keyTable.subarray(index * 129, index * 129 + 128);
        for (var k = 0; k < 128; k++) buf[k] ^= (ks[k] - 0x30) & 0xff;
        return buf;
    }

    function scatter(buf, steps, inits, cols, rows) {
        var table = new Uint8Array(rows * cols), offs = new Int32Array(inits);
        for (var i = 0; i < rows; i++)
            for (var j = 0; j < cols; j++) {
                table[j * rows + i] = buf[offs[j]];
                offs[j] = (offs[j] + steps[j]) % 128;
            }
        return table;
    }

    function docToPdl(prefix) {
        var n = (prefix[0] - 0x30) * 10 + (prefix[1] - 0x30), idx = n % 26;
        return { table: scatter(expandKey(prefix, BLTE, idx), PDL_STEPS, PDL_INITS, 16, 90), letter: 0x41 + idx };
    }

    function getxt256(prefix, mode) {
        var idx = mode === 0 ? prefix[0] - 0x41 : (((prefix[1] - 0x30) + (prefix[0] - 0x30) * 10) & 0xff);
        return scatter(expandKey(prefix, KEY2, idx), XT_STEPS, XT_INITS, 16, 128);
    }

    function perm6(t) {
        var out = new Uint8Array(90);
        for (var i = 0; i < 15; i++) {
            var b = i * 6, idx = t[b] * 32 + t[b + 1] * 16 + t[b + 2] * 8 + t[b + 3] * 4 + t[b + 4] * 2 + t[b + 5];
            var v = SBOX64[idx];
            for (var k = 0; k < 6; k++) out[b + k] = (v >> (5 - k)) & 1;
        }
        return out;
    }

    function rot43(a) { var r = new Uint8Array(a.length); r.set(a.subarray(43)); r.set(a.subarray(0, 43), a.length - 43); return r; }

    function phchgOts(block, table, mode) {
        var L = Uint8Array.from(block.subarray(0, 90)), R = Uint8Array.from(block.subarray(90, 180));
        for (var r = 0; r < 16; r++) {
            var base = (mode ? (15 - r) : r) * 90, t = new Uint8Array(90);
            for (var i = 0; i < 90; i++) t[i] = R[i] ^ table[base + i];
            var p = rot43(perm6(t));
            if (r < 15) { var nl = R, nr = new Uint8Array(90); for (var k = 0; k < 90; k++) nr[k] = L[k] ^ p[k]; L = nl; R = nr; }
            else { for (var m = 0; m < 90; m++) L[m] ^= p[m]; }
        }
        var out = new Uint8Array(180); out.set(L, 0); out.set(R, 90); return out;
    }

    function perm8(t) {
        var out = new Uint8Array(128);
        for (var i = 0; i < 16; i++) {
            var b = i * 8;
            var idx = t[b + 1] * 64 + t[b + 2] * 32 + t[b + 3] * 16 + t[b + 4] * 8 + t[b + 5] * 4 + t[b + 6] * 2 + t[b + 7];
            var v = (SBOX128[idx] + 2 * t[b]) & 0xff;
            for (var k = 0; k < 8; k++) out[b + k] = (v >> (7 - k)) & 1;
        }
        return out;
    }

    function pqxtlv256(block, table, mode) {
        var L = Uint8Array.from(block.subarray(0, 128)), R = Uint8Array.from(block.subarray(128, 256));
        for (var r = 0; r < 16; r++) {
            var base = (mode ? (15 - r) : r) * 128, t = new Uint8Array(128);
            for (var i = 0; i < 128; i++) t[i] = R[i] ^ table[base + i];
            var p = rot43(perm8(t));
            if (r < 15) { var nl = R, nr = new Uint8Array(128); for (var k = 0; k < 128; k++) nr[k] = L[k] ^ p[k]; L = nl; R = nr; }
            else { for (var m = 0; m < 128; m++) L[m] ^= p[m]; }
        }
        var out = new Uint8Array(256); out.set(L, 0); out.set(R, 128); return out;
    }

    function dmwToB(s81) {
        var out = new Uint8Array(256);
        for (var k = 0; k < 8; k++) {
            var v = parseInt(s81.substr(k * 10, 10) || '0', 10) >>> 0;
            for (var i = 0; i < 32; i++) out[k * 32 + i] = (v >>> (31 - i)) & 1;
        }
        return out;
    }

    function writeField(value, out, buf, pos, count, base) {
        for (var k = count - 1; k >= 0; k--) {
            var d = value % base; value = Math.floor(value / base);
            var ch = d + (base === 10 ? 0x30 : 0x41);
            if (d === 0x1a && pos === 0x10) ch = 0x20;
            buf[pos + k] = d; out[pos + k] = ch & 0xff;
        }
    }

    function dateValue(year, v) {
        var a = (year - 0x7d9) - (v % 7);
        return year - (a % 7);
    }

    function desrtfccn(val, bbuf, out, p4, p5, p6, p7) {
        var a = p4 * 31 + p5, b = p6 * 31 + p7, v = val;
        if (b < a && (0x173 - a) + b < 0x12d) v = val + 1;
        if (a < b && (a + 0x173) - b < 0x1f) v = val - 1;
        for (var i = 0; i < 4; i++) {
            var d = v % 10; v = Math.floor(v / 10);
            bbuf[0x29 - i] = d; out[0x29 - i] = d | 0x30;
        }
    }

    function btoM(bits, year, out) {
        var buf = new Uint8Array(0x60);
        var slots = {}; slots[0x2a] = year; slots[0x40] = year; slots[0x2c] = year; slots[0x42] = year;
        var i = 0;
        while (SCHEMA[i][0] !== 0xffffffff) {
            var code0 = SCHEMA[i][0], j = i;
            while (j < SCHEMA.length && SCHEMA[j][0] === code0) j++;
            var ip = j - 1, off = SCHEMA[ip][0], ln = SCHEMA[ip][1];
            var lr = ln >= 1 ? beBits(bits, off, ln) : 0;
            for (var idx = ip; idx > i; idx--) {
                var code = SCHEMA[idx][2], q = Math.floor(lr / SCHEMA[idx][5]);
                var val = lr - q * SCHEMA[idx][5]; lr = q;
                if (code === 0x21) out[0x25] = (bits[0x5f] ? 5 : 0) | 0x30;
                if (slots.hasOwnProperty(code)) { val += 1; slots[code] = val; }
                if (code === 0x3c) {
                    val = dateValue(year, val);
                    desrtfccn(val, buf, out, slots[0x40], slots[0x42], slots[0x2a], slots[0x2c]);
                }
                if (code === 0x1a) {
                    var u = (val & 0xff) % 0x24;
                    out[0x1a] = (u + (u <= 0x19 ? 0x41 : 0x16)) & 0xff;
                    continue;
                }
                writeField(val, out, buf, SCHEMA[idx][2], SCHEMA[idx][3], SCHEMA[idx][4]);
            }
            writeField(lr, out, buf, SCHEMA[i][2], SCHEMA[i][3], SCHEMA[i][4]);
            i = j;
        }
        return out;
    }

    function infotoIdver0(block) {
        var out = new Uint8Array(0x51), b = block;
        var v1 = Math.floor(beBits(b, 0, 32) / 4);
        var s1 = ('000000000' + v1).slice(-9);
        var v2f = beBits(b, 32, 32), v2 = Math.floor(v2f / 4);
        var s2 = ('000000000' + v2).slice(-9);
        var v3 = beBits(b, 224, 32);
        if (v3 & 1) s2 = s2.slice(0, 8) + 'X';
        var t = Math.floor(v3 / 20) % 19;
        var head = ('0' + ((Math.floor(v3 / 2) % 10) + (v2f & 3) * 10)).slice(-2) + ('0' + t).slice(-2);
        if (t === 0) s1 = String.fromCharCode.apply(null, CONST10.subarray(0, 9));
        var s = head + s1 + s2;
        for (var i = 0; i < 22; i++) out[i] = s.charCodeAt(i);
        for (var k = 0; k < 5; k++) {
            var v = beBits(b, (2 + k) * 32, 32);
            for (var m = 0; m < 4; m++) out[0x16 + k * 4 + m] = (v >>> (8 * m)) & 0xff;
        }
        var tail = ('0000000' + Math.floor(v3 / 380)).slice(-7);
        for (var n = 0; n < 7; n++) out[0x2a + n] = tail.charCodeAt(n);
        out[0x31] = 0;
        return out;
    }

    function phchjOts(s81) {
        var out = new Uint8Array(0x51);
        var v = parseInt(s81.substr(0, 6), 10);
        var head = ('0' + Math.floor(v / 30400)).slice(-2) + ('0' + (Math.floor(v / 800) % 19)).slice(-2);
        for (var i = 0; i < 4; i++) out[i] = head.charCodeAt(i);
        for (var k = 0; k < 18; k++) out[4 + k] = s81.charCodeAt(6 + k);
        out[0x16] = 0;
        if ((Math.floor(v / 15200)) & 1) out[0x15] = 0x58;
        for (var c = 0; c < 5; c++) {
            var n = parseInt(s81.substr(0x18 + c * 10, 10), 10) >>> 0;
            for (var m = 0; m < 4; m++) out[0x16 + c * 4 + m] = (n >>> (8 * m)) & 0xff;
        }
        for (var t = 0; t < 7; t++) out[0x2a + t] = s81.charCodeAt(0x4a + t);
        out[0x31] = 0;
        return out;
    }

    function cstr(u8) {
        var i = u8.indexOf(0);
        return i < 0 ? u8 : u8.subarray(0, i);
    }

    /* 144 位数字 -> 原始字节（117 字节，含 GB18030 姓名） */
    function decode(code, year) {
        code = String(code).trim();
        if (!/^\d{144}$/.test(code)) return null;
        var prefix = new Uint8Array(8);
        for (var i = 0; i < 8; i++) prefix[i] = code.charCodeAt(i);
        var n = (prefix[0] - 0x30) * 10 + (prefix[1] - 0x30);
        var bits = phchyOts(code.substr(8, 55));
        var pdl = docToPdl(prefix);
        var blk = phchgOts(bits, pdl.table, 1);
        var text = new Uint8Array(0x90);
        for (var k = 0; k < 55; k++) text[k] = code.charCodeAt(8 + k);
        text[55] = 0;
        btoM(blk, year, text);
        var tail = code.substr(63);
        var f4;
        if (n <= 25) {
            var b256 = dmwToB(tail);
            f4 = infotoIdver0(pqxtlv256(b256, getxt256(prefix, 1), 1));
        } else {
            f4 = phchjOts(tail);
        }
        var a = cstr(text.subarray(7)), b = cstr(f4);
        var res = new Uint8Array(1 + 6 + a.length + b.length);
        res[0] = pdl.letter;
        for (var m = 0; m < 6; m++) res[1 + m] = prefix[2 + m];
        res.set(a, 7); res.set(b, 7 + a.length);
        return res;
    }

    /* ---------------- 字段解析 ---------------- */
    var SEAT_STR = '0棚车@1硬座@2软座@3硬卧@4软卧@5包厢硬卧@4高级软卧@2一等软座@2二等软座@2商务座'
        + '@6鸳鸯软卧@1混编硬座@3混编硬卧@2包厢软座@2特等软座@4动卧@6二人软包@6一人软包'
        + '@2一等卧@2二等卧@2混编软座@4混编软卧@2一等座@@2二等座@2特等座@2多功能座'
        + '@2一等包座@4二等包座@@@@0无座';
    var SEAT_TYPES = {};
    SEAT_STR.split('@').forEach(function (v, i) {
        if (!v) return;
        var k = i < 10 ? String(i) : String.fromCharCode(i - 10 + 65);
        SEAT_TYPES[k] = [v.charAt(0), v.slice(1)];   // [席别大类, 名称]
    });
    var TICKET_TYPES = ' 孩学军 探半孩团兵红返卧团农助令';
    var ID_TYPES = ['',
        '居民身份证',                    // 01 ED（含港澳台居民居住证、外国人永久居留身份证）
        '其他', // 02 QT
        '临时身份证',                    // 03 LS
        '武警警官证',                    // 04 WJ
        '军官证',                        // 05 JG
        '士兵证',                        // 06 JS
        '军队学员证',                    // 07 JX
        '军队文职干部证',                 // 08 JW
        '军队离退休干部证',               // 09 JT
        '军人保障卡',                    // 10 JB
        '护照',                          // 11 HZ
        '港澳居民来往内地通行证',         // 12 GN
        '中华人民共和国旅行证',           // 13 LX
        '往来港澳通行证',                 // 14 NG
        '大陆居民往来台湾通行证',         // 15 NT
        '台湾居民来往大陆通行证',         // 16 TN
        '外国人居留证',                   // 17 WL
        '外国人出入境证',                 // 18 WR
        '外交官证',                       // 19 WG
        '领事官证',                       // 20 LG
        '海员证',                         // 21 HY
        '调度命令',                       // 22 DL
        '户口簿',                         // 23 HK
        '公务签证（乘车证）',             // 24 MP
        '刑满释放证明',                   // 25 SF
        '救助证明',                       // 26 JZ
        '', '', '', '', ''];               // 27-31 教材未收录

    var dec = new TextDecoder('gb18030');
    function txt(u8) { return dec.decode(u8); }
    function num(u8) { var v = parseInt(txt(u8), 10); return isNaN(v) ? 0 : v; }

    /* receipt=true：按“报销凭证”修正乘车年份（行程后打印，原库会多加一年） */
    function decodeTicket(code, year, receipt, stations) {
        if (year === undefined || year === null) year = ANCHOR_YEAR;
        var raw = decode(code, year);
        if (!raw) return null;
        var seatCode = txt(raw.subarray(26, 27)), flag = txt(raw.subarray(29, 30));
        var st = SEAT_TYPES[seatCode] || ['', ''];
        var seat = txt(raw.subarray(30, 33)), berth = '';
        if (flag === '3' || st[1] === '无座') {
            seat = '无座';
        } else if ((flag === '4' || flag === '5') && /^\d+$/.test(seat)) {
            var n0 = parseInt(seat, 10);
            seat = ('0' + (Math.floor(n0 / 6) + 1)).slice(-2) + String.fromCharCode(n0 % 6 + 65);
        } else if (st[0] >= '3' && /^\d+$/.test(seat)) {
            berth = '下中上'.charAt(parseInt(seat.slice(-1), 10) - 1) + '铺';
            seat = '0' + seat.slice(0, -1);
        }

        var coach = txt(raw.subarray(24, 26));
        if (/^\d+$/.test(coach) && +coach >= 31 && +coach < 64) {
            var c = +coach;
            coach = c === 31 ? '99' : (c === 32 ? '加' : '加' + (c - 33));
        }

        var idType = num(raw.subarray(68, 70)), idLen = num(raw.subarray(70, 72)) || 18;
        var idFieldStr = txt(raw.subarray(72, 90));          // 右对齐、左补 0
        var idNo = (idLen > 0 && idLen <= 18) ? idFieldStr.slice(-idLen) : '';
        if (idType === 0 || idType >= 31) idNo = '';         // app 对这两种类型不显示证件号
        var transit = num(raw.subarray(46, 47));             // 0 普通 / 1 中转·随原票使用
        var notes = [];
        if (transit) {
            notes.push('随原票使用');
            notes.push(txt(raw.subarray(33, 38)) === '00000' ? '中转签证' : '中转');
        }
        if (idType === 24) notes.push('随乘车证有效');        // 铁路乘车证签证
        var tt = num(raw.subarray(27, 29));
        var toC = txt(raw.subarray(10, 13)), viaC = txt(raw.subarray(13, 16));
        var y = num(raw.subarray(38, 42)), mo = num(raw.subarray(42, 44)), dd = num(raw.subarray(44, 46));
        var sy = num(raw.subarray(60, 64)), sm = num(raw.subarray(64, 66)), sd = num(raw.subarray(66, 68));
        if (receipt && (y * 10000 + mo * 100 + dd) > (sy * 10000 + sm * 100 + sd)) y -= 1;
        var p2 = function (v) { return ('0' + v).slice(-2); };
        return {
            raw: txt(raw),
            ticket_no: txt(raw.subarray(0, 7)),
            from_code: txt(raw.subarray(7, 10)),
            to_code: txt(raw.subarray(10, 13)),
            via_code: txt(raw.subarray(13, 16)) === 'AAA' ? '' : txt(raw.subarray(13, 16)),
            train: (txt(raw.subarray(16, 19)) + txt(raw.subarray(19, 24)).replace(/^0+/, '')).trim(),
            date: y + '-' + p2(mo) + '-' + p2(dd),
            time: txt(raw.subarray(110, 112)) + ':' + txt(raw.subarray(112, 114)),
            coach: coach,
            seat_no: seat,
            seat_berth: berth,
            seat_type: st[1],
            ticket_type: tt > 0 && tt <= TICKET_TYPES.length ? TICKET_TYPES[tt - 1].trim() : '',
            price: num(raw.subarray(33, 37)) + num(raw.subarray(37, 38)) / 10,
            settle_date: sy + '-' + p2(sm) + '-' + p2(sd),
            settle_md: txt(raw.subarray(64, 68)),
            pickup_tmis: txt(raw.subarray(50, 55)),
            pickup_type: txt(raw.subarray(55, 57)),
            machine_no: txt(raw.subarray(57, 60)),
            id_type: ID_TYPES[idType] !== undefined ? ID_TYPES[idType] : idType,
            id_type_code: idType,
            id_len: idLen,
            id_no: idNo,
            transit: transit,
            notes: notes,
            // 到站(10:13) == 经由站(13:16) 且 年≥2023 才换成“退票费 仅供报销使用”
            // 但空到站和空经由都是 'AAA'，不能让它俩相等就误判（澳门/南山南这类查不到电报码的站）
            restriction: (toC !== '' && toC !== 'AAA' && toC === viaC && y >= 2023)
                ? '退票费 仅供报销使用' : '限乘当日当次车',
            name: txt(raw.subarray(90, 110)).trim(),
            year: year,
            from_name: (stations && stations[txt(raw.subarray(7, 10))]) || '',
            to_name: (stations && stations[txt(raw.subarray(10, 13))]) || ''
        };
    }

    // ================================================================
    //                        编  码  器
    //   encodeRaw(117字节明文) -> 144 位码
    //   encodeTicket(票面字段)  -> 144 位码
    //   与上面 decode / decodeTicket 严格互逆
    // ================================================================

    var ALNUM36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var YEAR_BASE = 2009;                       // 码内只存 (结账年-2009)%7
    var _SEAT_LIST = null;

    function seatList() {
        if (!_SEAT_LIST) _SEAT_LIST = SEAT_STR.split('@');
        return _SEAT_LIST;
    }

    // ---- 容错取值：缺字段、乱输、带星号或符号都不报错，一律 0 占位 ----

    function digitsOf(s, n) {
        var d = String(s == null ? '' : s).replace(/\D/g, '');
        return pad(d.length > n ? d.slice(-n) : d, n);
    }

    function lettersOf(s, n, padCh) {
        var t = String(s == null ? '' : s).toUpperCase().replace(/[^A-Z]/g, '');
        return pad(t.length > n ? t.slice(-n) : t, n, padCh || 'A');
    }

    function intOf(s, dft) {
        var d = String(s == null ? '' : s).replace(/\D/g, '');
        return d === '' ? (dft || 0) : parseInt(d, 10);
    }

    function clampV(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    /** 任意日期串 -> [年, 月, 日]，越界夹到合法范围 */
    function date3(s) {
        var d = (String(s == null ? '' : s).replace(/\D/g, '') + '00000000').slice(0, 8);
        return [parseInt(d.slice(0, 4), 10) % 10000,
                clampV(parseInt(d.slice(4, 6), 10), 1, 12),
                clampV(parseInt(d.slice(6, 8), 10), 1, 31)];
    }

    /** 任意输入 -> 1 字母 + 6 数字；空输入 -> A000000（前缀正好 00 + 000000） */
    function ticketNoOf(s) {
        var t = String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, '');
        var m = /([A-Z]\d{6})$/.exec(t);
        if (m) return m[1];
        var l = /[A-Z]/.exec(t);
        return (l ? l[0] : 'A') + digitsOf(t, 6);
    }

    /** 去掉“新空调/空调/新型/普通”和括号，用于席别名归一 */
    function normSeat(s) {
        var t = String(s == null ? '' : s).replace(/[\s\u3000]/g, '');
        return t.replace(/新空调|空调|新型|普通|[（）()]/g, '').toUpperCase();
    }

    /** 票面别名：不对号入座 / 站票 在码里就是「无座」(W) */
    var SEAT_ALIAS = {
        '无座': 'W', '无座席': 'W', '不对号': 'W', '不对号入座': 'W', '站票': 'W'
    };

    /** 席别名/席别码 -> 明文用的 1 字符席别码（'1'硬座 … 'O'二等座 … 'W'无座）
     *  新空调硬座 / 硬座 / 硬座（新空调）都归到硬座；软卧、硬卧同理
     *  「不对号入座」「站票」按无座处理 */
    function seatCodeOf(x) {
        var s = String(x == null ? '' : x).trim().toUpperCase();
        if (SEAT_ALIAS[s]) return SEAT_ALIAS[s];
        if (s.length === 1 && ALNUM36.indexOf(s) >= 0) return s;
        var l = seatList(), n = normSeat(s), i, v;
        for (i = 0; i < l.length; i++) {                      // 1) 去噪后精确匹配
            if (l[i] && normSeat(l[i].slice(1)) === n) return ALNUM36.charAt(i);
        }
        var order = [];
        for (i = 0; i < l.length; i++) order.push(i);
        order.sort(function (a, b) { return (l[b] || '').length - (l[a] || '').length; });
        for (var k = 0; k < order.length; k++) {              // 2) 长名优先的包含匹配
            v = l[order[k]];
            if (!v) continue;
            var nm = normSeat(v.slice(1));
            if (nm && n && (n.indexOf(nm) >= 0 || nm.indexOf(n) >= 0)) return ALNUM36.charAt(order[k]);
        }
        for (var j = 0; j < s.length; j++) {                  // 3) 兜底取第一个合法字符
            if (ALNUM36.indexOf(s.charAt(j)) >= 0) return s.charAt(j);
        }
        return '0';
    }

    /** 明文席别字符 -> 密文里存的 0..35 数值（字母表 A-Z0-9） */
    function seatValOf(ch) {
        if (ch >= 'A' && ch <= 'Z') return ch.charCodeAt(0) - 65;
        return 26 + ((+ch) || 0);
    }

    /** 席别码 -> [大类, 名称]，大类 >= '3' 为卧铺 */
    function seatNameOf(ch) {
        ch = String(ch || '0');
        var i = (ch >= '0' && ch <= '9') ? (+ch) : 10 + ch.charCodeAt(0) - 65;
        var v = seatList()[i] || '';
        return v ? [v.charAt(0), v.slice(1)] : ['', ''];
    }

    // 票面底行 21 位码后面印的两个字母（证件类型简码）
    // JM / HZ / NG 有实票佐证（NG 见 2022 年 G070600）；其余按名称首字母推定
    // 铁路客票系统证件类型简拼（《铁路客运业务》表 3-1-1，序号即码内 68:70）
    var ID_TYPE_CODES = {
        ED: 1,   // 居民身份证
        QT: 2,   // 其他（暂住证/驾驶证/社保卡/医保卡）
        LS: 3,   // 临时身份证
        WJ: 4,   // 武警警官证
        JG: 5,   // 军官证
        JS: 6,   // 士兵证
        JX: 7,   // 军队学员证
        JW: 8,   // 军队文职干部证
        JT: 9,   // 军队离退休干部证
        JB: 10,  // 军人保障卡
        HZ: 11,  // 护照
        GN: 12,  // 港澳居民来往内地通行证
        LX: 13,  // 中华人民共和国旅行证
        NG: 14,  // 往来港澳通行证（实票 G070600）
        NT: 15,  // 大陆居民往来台湾通行证
        TN: 16,  // 台湾居民来往大陆通行证
        WL: 17,  // 外国人居留证
        WR: 18,  // 外国人出入境证
        WG: 19,  // 外交官证
        LG: 20,  // 领事官证
        HY: 21,  // 海员证
        DL: 22,  // 调度命令
        HK: 23,  // 户口簿
        MP: 24,  // 公务签证（铁路/通勤/特种乘车证，实票 F059379）
        SF: 25,  // 刑满释放证明
        JZ: 26   // 救助证明
    };

    // 号码 -> 简码（下拉用）
    var ID_TYPE_CODE_OF = {};
    Object.keys(ID_TYPE_CODES).forEach(function (k) { ID_TYPE_CODE_OF[ID_TYPE_CODES[k]] = k; });

    /** 证件类型 -> 码内数字：支持 'NG' 这类简码、中文名、或直接写数字 */
    function idTypeCodeOf(x) {
        var s = String(x == null ? '' : x).trim().toUpperCase();
        if (s === '') return 0;
        if (/^\d+$/.test(s)) return clampV(+s, 0, 31);
        if (Object.prototype.hasOwnProperty.call(ID_TYPE_CODES, s)) return ID_TYPE_CODES[s];
        for (var i = 0; i < ID_TYPES.length; i++) {
            var n = ID_TYPES[i];
            if (n && (n === s || n.indexOf(s) >= 0 || s.indexOf(n) >= 0)) return i;
        }
        return 1;
    }

    function ticketTypeVal(s) {
        s = String(s == null ? '' : s).trim();
        if (s === '') return 1;
        if (/^\d+$/.test(s)) return +s;
        var i = TICKET_TYPES.indexOf(s);
        return i < 0 ? 1 : i + 1;
    }

    /** 'C7658' -> ['  C','07658']；'4706' -> ['   ','04706']；空 -> ['   ','00000'] */
    function splitTrain(s) {
        var t = String(s == null ? '' : s).toUpperCase().replace(/[^A-Z0-9]/g, ''), i = 0;
        while (i < t.length && !/\d/.test(t.charAt(i))) i++;
        var letters = t.slice(0, i);
        letters = letters.length > 3 ? letters.slice(-3) : letters;
        return [pad(letters, 3, ' '), digitsOf(t.slice(i), 5)];
    }

    /** 从席位串推车厢：'06-1-002' / '061002' -> 6；'加2-0-001' -> 35 */
    function coachFromSeat(seat) {
        var s = String(seat == null ? '' : seat).trim().replace(/＋/g, '+');
        var m = /^(\d+)\s*车/.exec(s);                    // '3车无座' -> 3 号车厢
        if (m) return +m[1];
        var first = s ? s.split(/[\s\-]+/)[0] : '';
        // 紧凑加车 '+11023' / '加1 1 023' -> 加1 车 = 34（不能把后面的座位号当车号）
        var pm = /^[+加](\d)(?:[0-5])[0-9A-Za-z]{2,4}$/.exec(s);
        if (pm) return 33 + (+pm[1]);
        if (/[+加]/.test(first)) return coachVal(first);
        if (/^\d{1,2}$/.test(first)) return coachVal(first);   // '1-0-032' 的 1 也是整节车厢
        var d = s.replace(/\D/g, '');
        return d.length >= 2 ? +d.slice(0, 2) : 0;
    }

    /** '06' -> 6；'加'/'+0' -> 32；'加N' -> 33+N；'99' -> 31（无座车厢） */
    function coachVal(c) {
        c = String(c == null ? '' : c).trim().replace(/＋/g, '+');
        if (c === '' || c === '0') return 0;
        if (c === '99') return 31;
        if (/^\d+$/.test(c)) return +c;
        var m = /^[+加](\d*)$/.exec(c);
        if (m) return m[1] === '' ? 32 : 33 + (+m[1]);
        return intOf(c, 0);
    }

    /** 票价 -> [元, 角]；票价只有 .0 / .5（码内用 1 位存“半元”标志），上限 8191.5 */
    function priceOf(p) {
        var v = parseFloat(String(p == null ? '' : p).replace(/[^\d.\-]/g, ''));
        if (!isFinite(v) || v < 0) v = 0;
        var half = Math.min(Math.round(v * 2), 16383);
        return [Math.floor(half / 2), (half % 2 ? 5 : 0)];
    }

    /** 席位 -> [标志位, 3 位座位号]
     *  坐席 '05-0-090'（车厢-层-座位）；动车 '05-0-016A'（车厢-层-排+列）
     *  卧席 '08-0-012-1'（车厢-层-铺号-上中下 0/1/2）。认不出来就当 0 座 */
    function seatRaw(seat, seatType, flag) {
        var s = String(seat == null ? '' : seat).trim().replace(/＋/g, '+');
        if (flag !== undefined && flag !== null && String(flag).trim() !== '') {
            // 标志位 0-5、座位号 3 位，合起来必须 < 6001（字段的进制）
            return [String(clampV(intOf(flag), 0, 5)), digitsOf(s, 3)];
        }
        var nm = seatNameOf(seatCodeOf(seatType));
        var cat = nm[0];
        // 无座 / 不对号入座：码里仍占「车厢 + 内部序号」（防超售用），票面只显示“无座”
        // 序号照实车票可到 3 位（实票 01车 032 / 01车 037 / 05车 009），
        // 只有完全没写数字时才随机补一个 1-19 的小序号
        if (nm[1].indexOf('无座') >= 0 || /无座|不对号|站票/.test(s)) {
            // '3车无座' 的 3 是车厢不是座位号，先剥掉
            var dg = s.replace(/^\d+\s*车/, '').replace(/\D/g, '');
            var no = dg ? (+dg.slice(-3)) : (1 + Math.floor(Math.random() * 19));
            return ['0', pad(no, 3)];
        }
        var seg = s.replace(/[^0-9A-Za-z+]+/g, ' ').split(/\s+/).filter(function (x) { return x !== ''; });

        // ---- 紧凑写法（app 的输入格式）：「车厢 + 层码 + 座位」----
        //   061002  -> 06车 0层 002号（普速）
        //   01001A  -> 01车 0层 01A号（动车，排+列）
        //   +11023  -> 加1车 1层(下) 023号（加车）
        // 注意：车厢和层码也要一起吃掉，否则 01A 会被当成「1001 排」算出 999
        // 加车只有 1 位车号（+11023 = 加1车 1层 023号），普通车是 2 位，必须分开匹配
        var cm = /^(?:\+(\d)|(\d{2}))([0-5])([0-9A-Za-z]{2,4})$/.exec(s);
        if (cm) {
            var clv = String(clampV(+cm[3], 0, 5));
            var rest = cm[4];
            if (cat >= '3') {                       // 卧铺：末位是铺位 0下 1中 2上
                var b2 = rest.length >= 4 ? rest.charAt(3) : '0';
                return [clv, rest.slice(0, 3).slice(-2) + String(clampV((+b2) + 1, 1, 3))];
            }
            var dm = /^(\d+)([A-Za-z])$/.exec(rest);   // 动车：排+列 -> (排-1)*6+列
            if (dm) {
                return ['5', pad(clampV(((+dm[1]) - 1) * 6 + dm[2].toUpperCase().charCodeAt(0) - 65, 0, 999), 3)];
            }
            return [clv, digitsOf(rest, 3)];
        }

        var dom = /(\d+)([A-Za-z])\s*$/;
        var domVal = function (m) {
            return String(clampV(((+m[1]) - 1) * 6 + m[2].toUpperCase().charCodeAt(0) - 65, 0, 999));
        };
        if (seg.length >= 3) {
            var level = String(clampV(intOf(seg[1]), 0, 5));
            if (cat >= '3') {                        // 卧铺：票面末位 0下 1中 2上 -> 明文 1/2/3
                var berth = seg.length > 3 ? clampV(intOf(seg[3]), 0, 2) : 0;
                return [level, digitsOf(seg[2], 2).slice(-2) + String(berth + 1)];
            }
            var m = dom.exec(seg[2]);                // 动车：排+列 -> (排-1)*6+列
            if (m) return ['5', pad(domVal(m), 3)];
            return [level, digitsOf(seg[2], 3)];
        }
        if (seg.length === 2) return ['0', digitsOf(seg[1], 3)];
        var m2 = dom.exec(s);
        if (m2) return ['5', pad(domVal(m2), 3)];
        return ['0', digitsOf(s, 3)];
    }

    /** 证件 -> [类型, 长度, 18 字节]
     *  证件号在 18 字节里右对齐、左补 0，长度字段是有效位数；解码端取末尾“长度”位
     *  （票面 F059379 的 YNA028108 就只存了后 6 位 028108）。空证件号写 18 个空格。 */
    function idField(idNo, idType) {
        var v = String(idNo == null ? '' : idNo).trim().toUpperCase()
            .replace(/[^\x20-\x7e]/g, '');
        var type = idTypeCodeOf(idType);
        // 码里只有数字（末位可 X）。字母是号码前缀/标记，直接忽略：
        //   AB12345 -> 12345、CQ6691351 -> 6691351（与实票一致）
        // 星号、连字符等符号不是字母，用 0 顶位保持位置：CQ66913** -> 6691300
        var buf = '';
        for (var i = 0; i < v.length; i++) {
            var ch = v.charAt(i);
            if (ch >= '0' && ch <= '9') buf += ch;
            else if (ch === 'X' && i === v.length - 1) buf += ch;    // 末位 X 是校验位
            else if (/[A-Z]/.test(ch)) continue;                     // 其它字母：忽略
            else buf += '0';                                         // 星号等符号：0 顶位
        }
        var core = buf.slice(-18);
        var out = new Uint8Array(18);
        // 没证件号时类型给 0：app 规则是类型 0 或 >=31 就不显示证件行
        if (!core || core === 'X') { out.fill(0x20); return [0, 18, out]; }
        out.set(ascii(pad(core, 18, '0')), 0);
        return [type, core.length, out];
    }

    // ---- GB18030 编码：用 TextDecoder 反查出一张双字节表（懒加载） ----
    var _gbMap = null;
    function gbMap() {
        if (_gbMap) return _gbMap;
        var dec = new TextDecoder('gb18030');
        var pairs = [], buf = new Uint8Array(126 * 190 * 3), p = 0;
        for (var a = 0x81; a <= 0xfe; a++) {
            for (var b = 0x40; b <= 0xfe; b++) {
                if (b === 0x7f) continue;
                pairs.push((a << 8) | b);
                buf[p++] = a; buf[p++] = b; buf[p++] = 0x0a;
            }
        }
        var arr = dec.decode(buf.subarray(0, p)).split('\n');
        _gbMap = {};
        for (var i = 0; i < arr.length && i < pairs.length; i++) {
            var ch = arr[i];
            if (ch.length === 1 && ch !== '\ufffd' && !_gbMap[ch]) _gbMap[ch] = pairs[i];
        }
        return _gbMap;
    }

    /** 右对齐写入 n 字节（姓名在明文里是左补空格） */
    function gbField(str, n) {
        var m = gbMap(), chunks = [], total = 0;
        var chars = Array.from(String(str));       // 按码点切，代理对算一个字符
        for (var i = 0; i < chars.length; i++) {
            var ch = chars[i], c = ch.codePointAt(0), b;
            if (ch.length > 1) b = [0x3f];         // 四字节区（emoji）写 ?
            else if (c < 0x80) b = [c];
            else if (m[ch]) b = [m[ch] >> 8, m[ch] & 0xff];
            else b = [0x3f];
            if (total + b.length > n) break;
            chunks.push(b); total += b.length;
        }
        var out = new Uint8Array(n);
        out.fill(0x20);
        var off = n - total;
        for (var k = 0; k < chunks.length; k++) {
            for (var j = 0; j < chunks[k].length; j++) out[off++] = chunks[k][j];
        }
        return out;
    }

    // ---- 位工具（用除法，避免 32 位符号问题） ----
    function bitsOf(v, n) {
        var out = new Uint8Array(n);
        for (var i = n - 1; i >= 0; i--) { out[i] = v % 2; v = Math.floor(v / 2); }
        return out;
    }

    function valOf(bits, off, n) {
        var v = 0;
        for (var i = 0; i < n; i++) v = v * 2 + bits[off + i];
        return v;
    }

    function bitsToBig(bits) {
        var v = 0n;
        for (var i = 0; i < bits.length; i++) v = (v << 1n) | BigInt(bits[i]);
        return v;
    }

    function pad(v, n, ch) {
        var s = String(v);
        ch = ch === undefined ? '0' : ch;
        while (s.length < n) s = ch + s;
        return s;
    }

    // ---- Feistel 逆运算 ----
    function phchgEnc(block, table) {
        var L = Uint8Array.from(block.subarray(0, 90)), R = Uint8Array.from(block.subarray(90, 180));
        var k, t = new Uint8Array(90);
        for (k = 0; k < 90; k++) t[k] = R[k] ^ table[k];
        var p = rot43(perm6(t));
        for (k = 0; k < 90; k++) L[k] ^= p[k];
        for (var j = 14; j >= 0; j--) {
            var base = (15 - j) * 90;
            for (k = 0; k < 90; k++) t[k] = L[k] ^ table[base + k];
            p = rot43(perm6(t));
            var nr = new Uint8Array(90);
            for (k = 0; k < 90; k++) nr[k] = R[k] ^ p[k];
            R = L; L = nr;
        }
        var out = new Uint8Array(180); out.set(L, 0); out.set(R, 90); return out;
    }

    function pqxEnc(block, table) {
        var L = Uint8Array.from(block.subarray(0, 128)), R = Uint8Array.from(block.subarray(128, 256));
        var k, t = new Uint8Array(128);
        for (k = 0; k < 128; k++) t[k] = R[k] ^ table[k];
        var p = rot43(perm8(t));
        for (k = 0; k < 128; k++) L[k] ^= p[k];
        for (var j = 14; j >= 0; j--) {
            var base = (15 - j) * 128;
            for (k = 0; k < 128; k++) t[k] = L[k] ^ table[base + k];
            p = rot43(perm8(t));
            var nr = new Uint8Array(128);
            for (k = 0; k < 128; k++) nr[k] = R[k] ^ p[k];
            R = L; L = nr;
        }
        var out = new Uint8Array(256); out.set(L, 0); out.set(R, 128); return out;
    }

    // ---- 117 字节明文 -> 144 位码 ----
    function encodeRaw(raw, spare) {
        raw = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
        if (raw.length !== 117) throw new Error('明文长度应为 117，实为 ' + raw.length);
        var n = raw[0] - 65;
        var prefix = new Uint8Array(8);
        prefix[0] = 0x30 + Math.floor(n / 10);
        prefix[1] = 0x30 + (n % 10);
        for (var i = 2; i < 8; i++) prefix[i] = raw[i - 1];

        function nAt(a, b) { var v = parseInt(txt(raw.subarray(a, b)), 10); return isNaN(v) ? 0 : v; }
        function aAt(a, b) { var v = 0, s = txt(raw.subarray(a, b)); for (var i = 0; i < s.length; i++) v = v * 26 + (s.charCodeAt(i) - 65); return v; }
        function a27(a, b) { var v = 0, s = txt(raw.subarray(a, b)); for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); v = v * 27 + (c === 32 ? 26 : c - 65); } return v; }

        var price = nAt(33, 37) * 2 + (nAt(37, 38) & 1);      // 以“半元”为单位
        var yd = ((nAt(60, 64) - YEAR_BASE) % 7 + 7) % 7;
        var g0 = (aAt(7, 10) * 17576 + aAt(10, 13)) * 12 + (nAt(64, 66) - 1);
        var g1 = (aAt(13, 16) * 19683 + a27(16, 19)) * 12 + (nAt(42, 44) - 1);
        var g2 = (((((nAt(24, 26) * 32 + nAt(27, 29)) * 2 + nAt(46, 47)) * 2 + nAt(49, 50)) * 31
            + (nAt(66, 68) - 1)) * 16384) + price;
        var g3 = (nAt(50, 57) * 10 + nAt(57, 58)) * 31 + (nAt(44, 46) - 1);
        var g4 = (nAt(19, 24) * 6001 + nAt(29, 33)) * 7 + yd;
        var g5 = (((nAt(48, 49) * 26 + aAt(47, 48)) * 36 + seatValOf(txt(raw.subarray(26, 27))))
            * 100) + nAt(58, 60);

        var bits = new Uint8Array(180);
        var gs = [[g0, 0, 32], [g1, 32, 32], [g2, 64, 32], [g3, 96, 32], [g4, 128, 32], [g5, 160, 20]];
        for (var q = 0; q < gs.length; q++) bits.set(bitsOf(gs[q][0], gs[q][2]), gs[q][1]);

        var d55 = pad(bitsToBig(phchgEnc(bits, docToPdl(prefix).table)).toString(), 55);

        // ---- 尾部：证件 49 字节 ----
        var idType = nAt(68, 70), idLen = nAt(70, 72) || 18;
        var t9 = txt(raw.subarray(81, 90));
        var x = t9.slice(-1) === 'X' ? 1 : 0;
        var v1 = parseInt(txt(raw.subarray(72, 81)), 10) || 0;
        var v2 = x ? (parseInt(t9.slice(0, 8), 10) || 0) * 10 + 9 : (parseInt(t9, 10) || 0);
        var v3 = nAt(110, 117) * 380 + 20 * idLen + 2 * (idType % 10) + x;
        var d81;

        if (n <= 25) {
            var b256 = new Uint8Array(256);
            b256.set(bitsOf(v1 * 4, 32), 0);
            b256.set(bitsOf(v2 * 4 + Math.floor(idType / 10), 32), 32);
            for (var k = 0; k < 5; k++) {
                var off = 90 + 4 * k;
                var le = raw[off] | (raw[off + 1] << 8) | (raw[off + 2] << 16) | (raw[off + 3] << 24);
                b256.set(bitsOf(le >>> 0, 32), 64 + k * 32);
            }
            b256.set(bitsOf(v3, 32), 224);
            var e256 = pqxEnc(b256, getxt256(prefix, 1));
            d81 = '';
            for (var m = 0; m < 8; m++) d81 += pad(valOf(e256, m * 32, 32), 10);
            d81 += (spare === undefined ? '0' : String(spare));
        } else {
            var s81 = pad(30400 * idType + 15200 * x + 800 * idLen, 6) + txt(raw.subarray(72, 90));
            for (var k2 = 0; k2 < 5; k2++) {
                var o2 = 90 + 4 * k2;
                s81 += pad(((raw[o2] | (raw[o2 + 1] << 8) | (raw[o2 + 2] << 16) | (raw[o2 + 3] << 24)) >>> 0), 10);
            }
            d81 = s81 + pad(nAt(110, 117), 7) + (spare === undefined ? '0' : String(spare));
        }

        var head = '';
        for (var i2 = 0; i2 < 8; i2++) head += String.fromCharCode(prefix[i2]);
        return head + d55 + d81;
    }

    // ---- 票面字段 -> 117 字节明文（任何字段缺失/非法都不报错，按 0 占位） ----
    function buildRaw(f) {
        f = f || {};
        var tn = ticketNoOf(f.ticket_no);
        var tr = splitTrain(f.train);
        var stype = seatCodeOf(f.seat_type);
        // 席位里写了“无座 / 不对号入座”，席别也一并按无座处理
        if (/无座|不对号|站票/.test(String(f.seat == null ? '' : f.seat))
            && seatNameOf(stype)[1].indexOf('无座') < 0) stype = 'W';
        var st = seatRaw(f.seat, stype, f.seat_flag);
        var pr = priceOf(f.price);
        var tripSrc = (f.trip === undefined || f.trip === null || f.trip === '') ? f.date : f.trip;
        var settleSrc = (f.settle === undefined || f.settle === null || f.settle === '') ? tripSrc : f.settle;
        var trip = date3(tripSrc), settle = date3(settleSrc);
        var idf = idField(f.id_no, f.id_type);
        var tm = digitsOf(String(f.time == null ? '' : f.time).replace(/:/g, ''), 4);
        var coachField = String(f.coach == null ? '' : f.coach).trim();
        var coach = clampV(coachVal(coachField), 0, 63);
        if (coachField === '' || coachVal(coachField) > 63) coach = clampV(coachFromSeat(f.seat), 0, 63);
        // 无座票：推不出车厢时按 01 车（票面只印“无座”，码内仍是一节真实车厢 + 内部序号）
        if (coach === 0 && seatNameOf(stype)[1].indexOf('无座') >= 0) coach = 1;

        var parts = [
            ascii(tn),                                       // 0:7    票号
            ascii(lettersOf(f.from_code, 3)),                // 7:10   发站
            ascii(lettersOf(f.to_code, 3)),                  // 10:13  到站
            ascii(lettersOf(f.via_code, 3)),                 // 13:16  经由（空=AAA）
            ascii(tr[0]),                                    // 16:19  车次字母
            ascii(tr[1]),                                    // 19:24  车次数字
            ascii(pad(coach, 2)),                            // 24:26  车厢
            ascii(stype),                                    // 26:27  席别
            ascii(pad(clampV(ticketTypeVal(f.ticket_type), 1, 31), 2)),  // 27:29 票种（base 32）
            ascii(st[0]),                                    // 29:30  席位标志
            ascii(st[1]),                                    // 30:33  座位号
            ascii(pad(pr[0], 4) + pr[1]),                    // 33:38  票价
            ascii(pad(trip[0], 4) + pad(trip[1], 2) + pad(trip[2], 2)),      // 38:46 乘车日期
            ascii(String(intOf(f.transit) & 1)),             // 46:47  换乘
            ascii(lettersOf(f.visa || WATERMARK.visa, 1)),   // 47:48  字符A（本软件水印默认 Z）
            ascii(String(clampV(intOf(f.group, WATERMARK.group), 0, 9))),  // 48:49  数字B（水印默认 1）
            ascii(String(intOf(f.b49) & 1)),                 // 49:50  保留
            ascii(digitsOf(f.office, 5)),                    // 50:55  发售站 TMIS
            ascii(digitsOf(f.pickup_type, 2)),               // 55:57  取票方式
            ascii(digitsOf(f.machine, 3)),                   // 57:60  机号
            ascii(pad(settle[0], 4) + pad(settle[1], 2) + pad(settle[2], 2)), // 60:68 结账日期
            ascii(pad(idf[0], 2) + pad(idf[1], 2)),          // 68:72  证件类型/长度
            idf[2],                                          // 72:90  证件号
            gbField(String(f.name == null ? '' : f.name), 20),   // 90:110 姓名
            ascii(tm + '000')                                // 110:117 时刻 + 000
        ];

        var out = new Uint8Array(117), p = 0;
        for (var i = 0; i < parts.length; i++) { out.set(parts[i], p); p += parts[i].length; }
        if (p !== 117) throw new Error('明文长度 ' + p + ' != 117');
        return out;
    }

    function ascii(s) {
        var a = new Uint8Array(s.length);
        for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 0xff;
        return a;
    }

    /** 票面字段 -> 144 位码（最外层接口） */
    function encodeTicket(fields) {
        var f = fields || {};
        var spare = String(f.spare == null ? WATERMARK.spare : f.spare).replace(/\D/g, '');
        return encodeRaw(buildRaw(f), (spare || '0').slice(-1));
    }

    return {
        decode: decode, decodeTicket: decodeTicket, ANCHOR_YEAR: ANCHOR_YEAR,
        WATERMARK: WATERMARK,
        fakeStationCode: fakeStationCode,
        encode: encodeTicket, encodeTicket: encodeTicket,
        encodeRaw: encodeRaw, buildRaw: buildRaw,
        seatCodeOf: seatCodeOf, seatNameOf: seatNameOf, seatRaw: seatRaw,
        coachVal: coachVal, splitTrain: splitTrain, ticketTypeVal: ticketTypeVal,
        SEAT_LIST: seatList(), TICKET_TYPES: TICKET_TYPES, ALNUM36: ALNUM36,
        ID_TYPES: ID_TYPES, ID_TYPE_CODES: ID_TYPE_CODES, ID_TYPE_CODE_OF: ID_TYPE_CODE_OF,
        idTypeCodeOf: idTypeCodeOf
    };
});
