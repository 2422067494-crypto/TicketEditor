(() => {
  // —— 1) 挂到 window（关键！From-To.js / 其它脚本才能读到）——
  window.limitList = ['限乘当日当次车', '限乘当日当次车\u00A0\u00A0随原票使用', '仅供报销使用', '限乘当日当次车\u00A0\u00A0随乘车证有效'];
  window.limitListold = ['限乘当日当次车'];
  window.seatother = ['无座','不对号入座','1车无座','2车无座','3车无座','4车无座','5车无座','6车无座','7车无座','8车无座','9车无座','10车无座','11车无座','12车无座','13车无座','14车无座','15车无座','16车无座',];

  window.seatTypeList = [
    "硬座","软座","混编硬座","混编软座","二等软座","一等软座","特等软座","空调硬座","空调软座","新空调硬座","新空调软座",
    "新空调二等软座","新空调一等软座","新空调特等软座","新空调混编硬座","新空调混编软座",
    "硬卧","软卧","包厢硬卧","高级软卧","一人软包","混编硬卧","混编软卧","空调硬卧","空调软卧","新空调硬卧","新空调软卧",
    "二等座","一等座","特等座","商务座","多功能座","二等包座","优选一等座","新空调二等座","新空调一等座",
    "动卧","二等卧","一等卧","高级动卧",
  ];

  window.seatTypeListold = [
    "硬座普客", "硬座普快", "硬座快速", "硬座特快", "硬座直达",
    "软座普客", "软座普快", "软座快速", "软座特快", "软座直达",
    "硬座普客卧","硬座普快卧", "硬座快速卧", "硬座特快卧", "硬座直达卧",
    "软座普客卧","软座普快卧", "软座快速卧", "软座特快卧", "软座直达卧",
    "空调硬座普客", "空调硬座普快", "空调硬座快速", "空调硬座特快", "空调硬座直达",
    "空调软座普客", "空调软座普快", "空调软座快速", "空调软座特快", "空调软座直达",
    "空调硬座普客卧", "空调硬座普快卧", "空调硬座快速卧", "空调硬座特快卧", "空调硬座直达卧",
    "空调软座普客卧", "空调软座普快卧", "空调软座快速卧", "空调软座特快卧", "空调软座直达卧",
    "新空调硬座普客", "新空调硬座普快", "新空调硬座快速", "新空调硬座特快", "新空调硬座直达",
    "新空调软座普客", "新空调软座普快", "新空调软座快速", "新空调软座特快", "新空调软座直达",
    "新空调硬座普客卧", "新空调硬座普快卧", "新空调硬座快速卧", "新空调硬座特快卧", "新空调硬座直达卧",
    "新空调软座普客卧", "新空调软座普快卧", "新空调软座快速卧", "新空调软座特快卧", "新空调软座直达卧",
    "动车组一等座", "动车组二等座"
  ];

 //签证类型
  window.visaTypeList = [
    "仅供报销使用","始发改签","始发改签\u3000开车后改签不予退票","变更到站","中转签证","中转",
    "始发改签 已检","变更到站 已检","已检", "硬席乘车证签证", "软席乘车证签证"
  ];

 //特殊区域发到站列表
  window.stationSpecial = {
    '香港西九龙': 'HKWestKowloon',
    '红磡（九龙）': 'HungHom(Kowloon)',
    '红磡(九龙)': 'HungHom(Kowloon)',
    '九龙': 'Kowloon',
    '澳门': 'Macau',
    '红磡': 'HungHom',
    '西安': "Xi'an",
    '西安北':"Xi'anbei",
    '西安东':"Xi'andong",
    '西安南':"Xi'annan",
    '西安西':"Xi'anxi",
    '延安':"Yan'an",
    '长安':"Chang'an",
    '长安西':"Chang'anxi",
    '吉安':"Ji'an",
    '吉安西':"Ji'anxi",
    '六安':"Lu'an",
    '莘庄':"Xinzhuang",
    '固安': "Gu'an",
    '固安东': "Gu'andong",
  };

    // —— 2) 填充 datalist（两个页面各填自己的）——
  function fillDatalist(dl, values) {
    if (!dl) return;
    const frag = document.createDocumentFragment();
    (values || []).forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      frag.appendChild(opt);
    });
    dl.innerHTML = '';
    dl.appendChild(frag);
  }

  window.addEventListener('DOMContentLoaded', () => {
    // red2015
    document.querySelectorAll('.page.red2015 [id="seattypes"]')
      .forEach(dl => fillDatalist(dl, window.seatTypeList));
    document.querySelectorAll('.page.red2015 [id="visatypes"]')
      .forEach(dl => fillDatalist(dl, window.visaTypeList));
    document.querySelectorAll('.page.red2015 [id="limitation"]')
      .forEach(dl => fillDatalist(dl, window.limitList));
    document.querySelectorAll('.page.red2015 [id=seatother]')
      .forEach(dl => fillDatalist(dl, window.seatother));

    // red2009
    document.querySelectorAll('.page.red2009 [id="seattypesold"]')
      .forEach(dl => fillDatalist(dl, window.seatTypeListold));
    document.querySelectorAll('.page.red2009 [id="visatypes"]')
      .forEach(dl => fillDatalist(dl, window.visaTypeList));
    document.querySelectorAll('.page.red2009 [id=seatother]')
      .forEach(dl => fillDatalist(dl, window.seatother));
  });
})();