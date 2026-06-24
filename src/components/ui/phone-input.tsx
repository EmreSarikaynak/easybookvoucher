"use client";

import { useState, useRef, useEffect } from "react";
import { normalizeStoredPhone } from "@/lib/phone";

interface CountryCode {
  flag: string;
  code: string; // dial code e.g. "+90"
  abbr: string; // short label e.g. "TR"
  name: string; // full name for search
}

// Sıralama: önce TR (ev sahibi), ardından Türkiye'ye en çok turist gönderen
// ilk 15 ülke (Kültür ve Turizm Bakanlığı 2024 yabancı ziyaretçi verilerine
// göre büyükten küçüğe). Geri kalan tüm ülkeler Türkçe isim alfabetik.
const PRIORITY_COUNTRIES: CountryCode[] = [
  { flag: "🇹🇷", code: "+90",  abbr: "TR",  name: "Türkiye" },
  { flag: "🇷🇺", code: "+7",   abbr: "RU",  name: "Rusya" },
  { flag: "🇩🇪", code: "+49",  abbr: "DE",  name: "Almanya" },
  { flag: "🇬🇧", code: "+44",  abbr: "GB",  name: "İngiltere" },
  { flag: "🇧🇬", code: "+359", abbr: "BG",  name: "Bulgaristan" },
  { flag: "🇮🇷", code: "+98",  abbr: "IR",  name: "İran" },
  { flag: "🇵🇱", code: "+48",  abbr: "PL",  name: "Polonya" },
  { flag: "🇺🇦", code: "+380", abbr: "UA",  name: "Ukrayna" },
  { flag: "🇳🇱", code: "+31",  abbr: "NL",  name: "Hollanda" },
  { flag: "🇬🇪", code: "+995", abbr: "GE",  name: "Gürcistan" },
  { flag: "🇺🇸", code: "+1",   abbr: "US",  name: "ABD" },
  { flag: "🇷🇴", code: "+40",  abbr: "RO",  name: "Romanya" },
  { flag: "🇦🇿", code: "+994", abbr: "AZ",  name: "Azerbaycan" },
  { flag: "🇫🇷", code: "+33",  abbr: "FR",  name: "Fransa" },
  { flag: "🇮🇶", code: "+964", abbr: "IQ",  name: "Irak" },
  { flag: "🇸🇦", code: "+966", abbr: "SA",  name: "Suudi Arabistan" },
];

const OTHER_COUNTRIES: CountryCode[] = [
  { flag: "🇦🇫", code: "+93",  abbr: "AF",  name: "Afganistan" },
  { flag: "🇦🇽", code: "+358", abbr: "AX",  name: "Aland Adaları" },
  { flag: "🇦🇱", code: "+355", abbr: "AL",  name: "Arnavutluk" },
  { flag: "🇩🇿", code: "+213", abbr: "DZ",  name: "Cezayir" },
  { flag: "🇦🇸", code: "+1684", abbr: "AS", name: "Amerikan Samoası" },
  { flag: "🇦🇩", code: "+376", abbr: "AD",  name: "Andorra" },
  { flag: "🇦🇴", code: "+244", abbr: "AO",  name: "Angola" },
  { flag: "🇦🇮", code: "+1264", abbr: "AI", name: "Anguilla" },
  { flag: "🇦🇬", code: "+1268", abbr: "AG", name: "Antigua ve Barbuda" },
  { flag: "🇦🇷", code: "+54",  abbr: "AR",  name: "Arjantin" },
  { flag: "🇦🇲", code: "+374", abbr: "AM",  name: "Ermenistan" },
  { flag: "🇦🇼", code: "+297", abbr: "AW",  name: "Aruba" },
  { flag: "🇦🇺", code: "+61",  abbr: "AU",  name: "Avustralya" },
  { flag: "🇦🇹", code: "+43",  abbr: "AT",  name: "Avusturya" },
  { flag: "🇧🇸", code: "+1242", abbr: "BS", name: "Bahamalar" },
  { flag: "🇧🇭", code: "+973", abbr: "BH",  name: "Bahreyn" },
  { flag: "🇧🇩", code: "+880", abbr: "BD",  name: "Bangladeş" },
  { flag: "🇧🇧", code: "+1246", abbr: "BB", name: "Barbados" },
  { flag: "🇧🇾", code: "+375", abbr: "BY",  name: "Belarus" },
  { flag: "🇧🇪", code: "+32",  abbr: "BE",  name: "Belçika" },
  { flag: "🇧🇿", code: "+501", abbr: "BZ",  name: "Belize" },
  { flag: "🇧🇯", code: "+229", abbr: "BJ",  name: "Benin" },
  { flag: "🇧🇲", code: "+1441", abbr: "BM", name: "Bermuda" },
  { flag: "🇧🇹", code: "+975", abbr: "BT",  name: "Butan" },
  { flag: "🇧🇴", code: "+591", abbr: "BO",  name: "Bolivya" },
  { flag: "🇧🇶", code: "+599", abbr: "BQ",  name: "Bonaire, Sint Eustatius ve Saba" },
  { flag: "🇧🇦", code: "+387", abbr: "BA",  name: "Bosna Hersek" },
  { flag: "🇧🇼", code: "+267", abbr: "BW",  name: "Botsvana" },
  { flag: "🇧🇷", code: "+55",  abbr: "BR",  name: "Brezilya" },
  { flag: "🇮🇴", code: "+246", abbr: "IO",  name: "Britanya Hint Okyanusu Toprakları" },
  { flag: "🇻🇬", code: "+1284", abbr: "VG", name: "Britanya Virjin Adaları" },
  { flag: "🇧🇳", code: "+673", abbr: "BN",  name: "Brunei" },
  { flag: "🇧🇫", code: "+226", abbr: "BF",  name: "Burkina Faso" },
  { flag: "🇧🇮", code: "+257", abbr: "BI",  name: "Burundi" },
  { flag: "🇰🇭", code: "+855", abbr: "KH",  name: "Kamboçya" },
  { flag: "🇨🇲", code: "+237", abbr: "CM",  name: "Kamerun" },
  { flag: "🇨🇦", code: "+1",   abbr: "CA",  name: "Kanada" },
  { flag: "🇨🇻", code: "+238", abbr: "CV",  name: "Cabo Verde" },
  { flag: "🇰🇾", code: "+1345", abbr: "KY", name: "Cayman Adaları" },
  { flag: "🇨🇫", code: "+236", abbr: "CF",  name: "Orta Afrika Cumhuriyeti" },
  { flag: "🇹🇩", code: "+235", abbr: "TD",  name: "Çad" },
  { flag: "🇨🇱", code: "+56",  abbr: "CL",  name: "Şili" },
  { flag: "🇨🇳", code: "+86",  abbr: "CN",  name: "Çin" },
  { flag: "🇨🇽", code: "+61",  abbr: "CX",  name: "Christmas Adası" },
  { flag: "🇨🇨", code: "+61",  abbr: "CC",  name: "Cocos Adaları" },
  { flag: "🇨🇴", code: "+57",  abbr: "CO",  name: "Kolombiya" },
  { flag: "🇰🇲", code: "+269", abbr: "KM",  name: "Komorlar" },
  { flag: "🇨🇬", code: "+242", abbr: "CG",  name: "Kongo Cumhuriyeti" },
  { flag: "🇨🇩", code: "+243", abbr: "CD",  name: "Kongo Demokratik Cumhuriyeti" },
  { flag: "🇨🇰", code: "+682", abbr: "CK",  name: "Cook Adaları" },
  { flag: "🇨🇷", code: "+506", abbr: "CR",  name: "Kosta Rika" },
  { flag: "🇨🇮", code: "+225", abbr: "CI",  name: "Fildişi Sahili" },
  { flag: "🇭🇷", code: "+385", abbr: "HR",  name: "Hırvatistan" },
  { flag: "🇨🇺", code: "+53",  abbr: "CU",  name: "Küba" },
  { flag: "🇨🇼", code: "+599", abbr: "CW",  name: "Curaçao" },
  { flag: "🇨🇾", code: "+357", abbr: "CY",  name: "Kıbrıs" },
  { flag: "🇨🇿", code: "+420", abbr: "CZ",  name: "Çekya" },
  { flag: "🇩🇰", code: "+45",  abbr: "DK",  name: "Danimarka" },
  { flag: "🇩🇯", code: "+253", abbr: "DJ",  name: "Cibuti" },
  { flag: "🇩🇲", code: "+1767", abbr: "DM", name: "Dominika" },
  { flag: "🇩🇴", code: "+1809", abbr: "DO", name: "Dominik Cumhuriyeti" },
  { flag: "🇪🇨", code: "+593", abbr: "EC",  name: "Ekvador" },
  { flag: "🇪🇬", code: "+20",  abbr: "EG",  name: "Mısır" },
  { flag: "🇸🇻", code: "+503", abbr: "SV",  name: "El Salvador" },
  { flag: "🇬🇶", code: "+240", abbr: "GQ",  name: "Ekvator Ginesi" },
  { flag: "🇪🇷", code: "+291", abbr: "ER",  name: "Eritre" },
  { flag: "🇪🇪", code: "+372", abbr: "EE",  name: "Estonya" },
  { flag: "🇸🇿", code: "+268", abbr: "SZ",  name: "Esvatini" },
  { flag: "🇪🇹", code: "+251", abbr: "ET",  name: "Etiyopya" },
  { flag: "🇫🇰", code: "+500", abbr: "FK",  name: "Falkland Adaları" },
  { flag: "🇫🇴", code: "+298", abbr: "FO",  name: "Faroe Adaları" },
  { flag: "🇫🇯", code: "+679", abbr: "FJ",  name: "Fiji" },
  { flag: "🇫🇮", code: "+358", abbr: "FI",  name: "Finlandiya" },
  { flag: "🇬🇫", code: "+594", abbr: "GF",  name: "Fransız Guyanası" },
  { flag: "🇵🇫", code: "+689", abbr: "PF",  name: "Fransız Polinezyası" },
  { flag: "🇬🇦", code: "+241", abbr: "GA",  name: "Gabon" },
  { flag: "🇬🇲", code: "+220", abbr: "GM",  name: "Gambiya" },
  { flag: "🇬🇭", code: "+233", abbr: "GH",  name: "Gana" },
  { flag: "🇬🇮", code: "+350", abbr: "GI",  name: "Cebelitarık" },
  { flag: "🇬🇷", code: "+30",  abbr: "GR",  name: "Yunanistan" },
  { flag: "🇬🇱", code: "+299", abbr: "GL",  name: "Grönland" },
  { flag: "🇬🇩", code: "+1473", abbr: "GD", name: "Grenada" },
  { flag: "🇬🇵", code: "+590", abbr: "GP",  name: "Guadeloupe" },
  { flag: "🇬🇺", code: "+1671", abbr: "GU", name: "Guam" },
  { flag: "🇬🇹", code: "+502", abbr: "GT",  name: "Guatemala" },
  { flag: "🇬🇬", code: "+44",  abbr: "GG",  name: "Guernsey" },
  { flag: "🇬🇳", code: "+224", abbr: "GN",  name: "Gine" },
  { flag: "🇬🇼", code: "+245", abbr: "GW",  name: "Gine-Bissau" },
  { flag: "🇬🇾", code: "+592", abbr: "GY",  name: "Guyana" },
  { flag: "🇭🇹", code: "+509", abbr: "HT",  name: "Haiti" },
  { flag: "🇭🇳", code: "+504", abbr: "HN",  name: "Honduras" },
  { flag: "🇭🇰", code: "+852", abbr: "HK",  name: "Hong Kong" },
  { flag: "🇭🇺", code: "+36",  abbr: "HU",  name: "Macaristan" },
  { flag: "🇮🇸", code: "+354", abbr: "IS",  name: "İzlanda" },
  { flag: "🇮🇳", code: "+91",  abbr: "IN",  name: "Hindistan" },
  { flag: "🇮🇩", code: "+62",  abbr: "ID",  name: "Endonezya" },
  { flag: "🇮🇪", code: "+353", abbr: "IE",  name: "İrlanda" },
  { flag: "🇮🇲", code: "+44",  abbr: "IM",  name: "Man Adası" },
  { flag: "🇮🇱", code: "+972", abbr: "IL",  name: "İsrail" },
  { flag: "🇯🇲", code: "+1876", abbr: "JM", name: "Jamaika" },
  { flag: "🇯🇵", code: "+81",  abbr: "JP",  name: "Japonya" },
  { flag: "🇯🇪", code: "+44",  abbr: "JE",  name: "Jersey" },
  { flag: "🇯🇴", code: "+962", abbr: "JO",  name: "Ürdün" },
  { flag: "🇰🇿", code: "+7",   abbr: "KZ",  name: "Kazakistan" },
  { flag: "🇰🇪", code: "+254", abbr: "KE",  name: "Kenya" },
  { flag: "🇰🇮", code: "+686", abbr: "KI",  name: "Kiribati" },
  { flag: "🇽🇰", code: "+383", abbr: "XK",  name: "Kosova" },
  { flag: "🇰🇬", code: "+996", abbr: "KG",  name: "Kırgızistan" },
  { flag: "🇱🇦", code: "+856", abbr: "LA",  name: "Laos" },
  { flag: "🇱🇻", code: "+371", abbr: "LV",  name: "Letonya" },
  { flag: "🇱🇧", code: "+961", abbr: "LB",  name: "Lübnan" },
  { flag: "🇱🇸", code: "+266", abbr: "LS",  name: "Lesotho" },
  { flag: "🇱🇷", code: "+231", abbr: "LR",  name: "Liberya" },
  { flag: "🇱🇾", code: "+218", abbr: "LY",  name: "Libya" },
  { flag: "🇱🇮", code: "+423", abbr: "LI",  name: "Liechtenstein" },
  { flag: "🇱🇹", code: "+370", abbr: "LT",  name: "Litvanya" },
  { flag: "🇱🇺", code: "+352", abbr: "LU",  name: "Lüksemburg" },
  { flag: "🇲🇴", code: "+853", abbr: "MO",  name: "Makao" },
  { flag: "🇲🇰", code: "+389", abbr: "MK",  name: "Kuzey Makedonya" },
  { flag: "🇲🇬", code: "+261", abbr: "MG",  name: "Madagaskar" },
  { flag: "🇲🇼", code: "+265", abbr: "MW",  name: "Malavi" },
  { flag: "🇲🇾", code: "+60",  abbr: "MY",  name: "Malezya" },
  { flag: "🇲🇻", code: "+960", abbr: "MV",  name: "Maldivler" },
  { flag: "🇲🇱", code: "+223", abbr: "ML",  name: "Mali" },
  { flag: "🇲🇹", code: "+356", abbr: "MT",  name: "Malta" },
  { flag: "🇲🇭", code: "+692", abbr: "MH",  name: "Marshall Adaları" },
  { flag: "🇲🇶", code: "+596", abbr: "MQ",  name: "Martinik" },
  { flag: "🇲🇷", code: "+222", abbr: "MR",  name: "Moritanya" },
  { flag: "🇲🇺", code: "+230", abbr: "MU",  name: "Mauritius" },
  { flag: "🇾🇹", code: "+262", abbr: "YT",  name: "Mayotte" },
  { flag: "🇲🇽", code: "+52",  abbr: "MX",  name: "Meksika" },
  { flag: "🇫🇲", code: "+691", abbr: "FM",  name: "Mikronezya" },
  { flag: "🇲🇩", code: "+373", abbr: "MD",  name: "Moldova" },
  { flag: "🇲🇨", code: "+377", abbr: "MC",  name: "Monako" },
  { flag: "🇲🇳", code: "+976", abbr: "MN",  name: "Moğolistan" },
  { flag: "🇲🇪", code: "+382", abbr: "ME",  name: "Karadağ" },
  { flag: "🇲🇸", code: "+1664", abbr: "MS", name: "Montserrat" },
  { flag: "🇲🇦", code: "+212", abbr: "MA",  name: "Fas" },
  { flag: "🇲🇿", code: "+258", abbr: "MZ",  name: "Mozambik" },
  { flag: "🇲🇲", code: "+95",  abbr: "MM",  name: "Myanmar" },
  { flag: "🇳🇦", code: "+264", abbr: "NA",  name: "Namibya" },
  { flag: "🇳🇷", code: "+674", abbr: "NR",  name: "Nauru" },
  { flag: "🇳🇵", code: "+977", abbr: "NP",  name: "Nepal" },
  { flag: "🇳🇨", code: "+687", abbr: "NC",  name: "Yeni Kaledonya" },
  { flag: "🇳🇿", code: "+64",  abbr: "NZ",  name: "Yeni Zelanda" },
  { flag: "🇳🇮", code: "+505", abbr: "NI",  name: "Nikaragua" },
  { flag: "🇳🇪", code: "+227", abbr: "NE",  name: "Nijer" },
  { flag: "🇳🇬", code: "+234", abbr: "NG",  name: "Nijerya" },
  { flag: "🇳🇺", code: "+683", abbr: "NU",  name: "Niue" },
  { flag: "🇳🇫", code: "+672", abbr: "NF",  name: "Norfolk Adası" },
  { flag: "🇰🇵", code: "+850", abbr: "KP",  name: "Kuzey Kore" },
  { flag: "🇲🇵", code: "+1670", abbr: "MP", name: "Kuzey Mariana Adaları" },
  { flag: "🇳🇴", code: "+47",  abbr: "NO",  name: "Norveç" },
  { flag: "🇴🇲", code: "+968", abbr: "OM",  name: "Umman" },
  { flag: "🇵🇰", code: "+92",  abbr: "PK",  name: "Pakistan" },
  { flag: "🇵🇼", code: "+680", abbr: "PW",  name: "Palau" },
  { flag: "🇵🇸", code: "+970", abbr: "PS",  name: "Filistin" },
  { flag: "🇵🇦", code: "+507", abbr: "PA",  name: "Panama" },
  { flag: "🇵🇬", code: "+675", abbr: "PG",  name: "Papua Yeni Gine" },
  { flag: "🇵🇾", code: "+595", abbr: "PY",  name: "Paraguay" },
  { flag: "🇵🇪", code: "+51",  abbr: "PE",  name: "Peru" },
  { flag: "🇵🇭", code: "+63",  abbr: "PH",  name: "Filipinler" },
  { flag: "🇵🇳", code: "+64",  abbr: "PN",  name: "Pitcairn Adaları" },
  { flag: "🇵🇹", code: "+351", abbr: "PT",  name: "Portekiz" },
  { flag: "🇵🇷", code: "+1787", abbr: "PR", name: "Porto Riko" },
  { flag: "🇷🇪", code: "+262", abbr: "RE",  name: "Réunion" },
  { flag: "🇷🇼", code: "+250", abbr: "RW",  name: "Ruanda" },
  { flag: "🇧🇱", code: "+590", abbr: "BL",  name: "Saint Barthélemy" },
  { flag: "🇸🇭", code: "+290", abbr: "SH",  name: "Saint Helena" },
  { flag: "🇰🇳", code: "+1869", abbr: "KN", name: "Saint Kitts ve Nevis" },
  { flag: "🇱🇨", code: "+1758", abbr: "LC", name: "Saint Lucia" },
  { flag: "🇲🇫", code: "+590", abbr: "MF",  name: "Saint Martin" },
  { flag: "🇵🇲", code: "+508", abbr: "PM",  name: "Saint Pierre ve Miquelon" },
  { flag: "🇻🇨", code: "+1784", abbr: "VC", name: "Saint Vincent ve Grenadinler" },
  { flag: "🇼🇸", code: "+685", abbr: "WS",  name: "Samoa" },
  { flag: "🇸🇲", code: "+378", abbr: "SM",  name: "San Marino" },
  { flag: "🇸🇹", code: "+239", abbr: "ST",  name: "São Tomé ve Príncipe" },
  { flag: "🇸🇳", code: "+221", abbr: "SN",  name: "Senegal" },
  { flag: "🇷🇸", code: "+381", abbr: "RS",  name: "Sırbistan" },
  { flag: "🇸🇨", code: "+248", abbr: "SC",  name: "Seyşeller" },
  { flag: "🇸🇱", code: "+232", abbr: "SL",  name: "Sierra Leone" },
  { flag: "🇸🇬", code: "+65",  abbr: "SG",  name: "Singapur" },
  { flag: "🇸🇽", code: "+1721", abbr: "SX", name: "Sint Maarten" },
  { flag: "🇸🇰", code: "+421", abbr: "SK",  name: "Slovakya" },
  { flag: "🇸🇮", code: "+386", abbr: "SI",  name: "Slovenya" },
  { flag: "🇸🇧", code: "+677", abbr: "SB",  name: "Solomon Adaları" },
  { flag: "🇸🇴", code: "+252", abbr: "SO",  name: "Somali" },
  { flag: "🇿🇦", code: "+27",  abbr: "ZA",  name: "Güney Afrika" },
  { flag: "🇰🇷", code: "+82",  abbr: "KR",  name: "Güney Kore" },
  { flag: "🇸🇸", code: "+211", abbr: "SS",  name: "Güney Sudan" },
  { flag: "🇱🇰", code: "+94",  abbr: "LK",  name: "Sri Lanka" },
  { flag: "🇸🇩", code: "+249", abbr: "SD",  name: "Sudan" },
  { flag: "🇸🇷", code: "+597", abbr: "SR",  name: "Surinam" },
  { flag: "🇸🇪", code: "+46",  abbr: "SE",  name: "İsveç" },
  { flag: "🇨🇭", code: "+41",  abbr: "CH",  name: "İsviçre" },
  { flag: "🇸🇾", code: "+963", abbr: "SY",  name: "Suriye" },
  { flag: "🇹🇼", code: "+886", abbr: "TW",  name: "Tayvan" },
  { flag: "🇹🇯", code: "+992", abbr: "TJ",  name: "Tacikistan" },
  { flag: "🇹🇿", code: "+255", abbr: "TZ",  name: "Tanzanya" },
  { flag: "🇹🇭", code: "+66",  abbr: "TH",  name: "Tayland" },
  { flag: "🇹🇱", code: "+670", abbr: "TL",  name: "Doğu Timor" },
  { flag: "🇹🇬", code: "+228", abbr: "TG",  name: "Togo" },
  { flag: "🇹🇰", code: "+690", abbr: "TK",  name: "Tokelau" },
  { flag: "🇹🇴", code: "+676", abbr: "TO",  name: "Tonga" },
  { flag: "🇹🇹", code: "+1868", abbr: "TT", name: "Trinidad ve Tobago" },
  { flag: "🇹🇳", code: "+216", abbr: "TN",  name: "Tunus" },
  { flag: "🇹🇲", code: "+993", abbr: "TM",  name: "Türkmenistan" },
  { flag: "🇹🇨", code: "+1649", abbr: "TC", name: "Turks ve Caicos Adaları" },
  { flag: "🇹🇻", code: "+688", abbr: "TV",  name: "Tuvalu" },
  { flag: "🇺🇬", code: "+256", abbr: "UG",  name: "Uganda" },
  { flag: "🇺🇾", code: "+598", abbr: "UY",  name: "Uruguay" },
  { flag: "🇺🇿", code: "+998", abbr: "UZ",  name: "Özbekistan" },
  { flag: "🇻🇺", code: "+678", abbr: "VU",  name: "Vanuatu" },
  { flag: "🇻🇦", code: "+379", abbr: "VA",  name: "Vatikan" },
  { flag: "🇻🇪", code: "+58",  abbr: "VE",  name: "Venezuela" },
  { flag: "🇻🇳", code: "+84",  abbr: "VN",  name: "Vietnam" },
  { flag: "🇻🇮", code: "+1340", abbr: "VI", name: "ABD Virjin Adaları" },
  { flag: "🇼🇫", code: "+681", abbr: "WF",  name: "Wallis ve Futuna" },
  { flag: "🇾🇪", code: "+967", abbr: "YE",  name: "Yemen" },
  { flag: "🇿🇲", code: "+260", abbr: "ZM",  name: "Zambiya" },
  { flag: "🇿🇼", code: "+263", abbr: "ZW",  name: "Zimbabve" },
  { flag: "🇦🇪", code: "+971", abbr: "AE",  name: "BAE" },
  { flag: "🇰🇼", code: "+965", abbr: "KW",  name: "Kuveyt" },
  { flag: "🇶🇦", code: "+974", abbr: "QA",  name: "Katar" },
  { flag: "🇮🇹", code: "+39",  abbr: "IT",  name: "İtalya" },
  { flag: "🇪🇸", code: "+34",  abbr: "ES",  name: "İspanya" },
].sort((a, b) => a.name.localeCompare(b.name, "tr"));

const COUNTRY_CODES: CountryCode[] = [...PRIORITY_COUNTRIES, ...OTHER_COUNTRIES];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
}

/**
 * Parses a stored phone value like "+905551234567" into {dialCode: "+90", local: "5551234567"}
 */
function parsePhone(value: string): { country: CountryCode; local: string } {
  const defaultCountry = COUNTRY_CODES[0]; // Turkey
  if (!value) return { country: defaultCountry, local: "" };

  // Try to match known dial codes (longest first to avoid prefix conflicts)
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (value.startsWith(c.code)) {
      return { country: c, local: value.slice(c.code.length).trimStart() };
    }
  }
  // No match — assume Turkey
  return { country: defaultCountry, local: value };
}

export function PhoneInput({ value, onChange, id, className }: PhoneInputProps) {
  const parsed = parsePhone(value);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(parsed.country);
  const [localNumber, setLocalNumber] = useState(parsed.local);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sync outward value when either part changes (kayıt formatı: +905551234567)
  useEffect(() => {
    if (!localNumber) {
      onChange("");
      return;
    }
    let local = localNumber.replace(/[^0-9]/g, "");
    // +90 seçiliyken 0553... → 553... (çift 90 önlenir)
    if (selectedCountry.code === "+90" && local.startsWith("0")) {
      local = local.slice(1);
    }
    const raw = `${selectedCountry.code}${local}`;
    onChange(normalizeStoredPhone(raw) ?? raw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, localNumber]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = COUNTRY_CODES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.abbr.toLowerCase().includes(search.toLowerCase()) ||
      c.code.includes(search)
  );

  const handleSelect = (country: CountryCode) => {
    setSelectedCountry(country);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={`flex min-w-0 ${className ?? ""}`} ref={dropdownRef} style={{ position: "relative" }}>
      {/* Country selector button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-2 py-2 border border-r-0 border-input rounded-l-md bg-muted hover:bg-muted/80 transition-colors shrink-0 h-10"
        title={selectedCountry.name}
        aria-label="Ülke kodu seç"
      >
        <span className="text-base leading-none">{selectedCountry.flag}</span>
        <span className="text-xs text-muted-foreground font-mono whitespace-nowrap">{selectedCountry.code}</span>
        <svg className="w-3 h-3 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Phone number input */}
      <input
        id={id}
        type="tel"
        value={localNumber}
        onChange={(e) => setLocalNumber(e.target.value.replace(/[^0-9\s\-]/g, ""))}
        placeholder="5XX XXX XX XX"
        className="flex h-10 min-w-0 flex-1 rounded-r-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        autoComplete="tel-national"
      />

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border border-border bg-popover shadow-lg"
          style={{ maxHeight: "280px", display: "flex", flexDirection: "column" }}
        >
          {/* Search */}
          <div className="p-2 border-b border-border">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ülke ara..."
              className="w-full rounded-sm border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Sonuç bulunamadı</div>
            ) : (
              filtered.map((c) => (
                <button
                  key={`${c.abbr}-${c.code}`}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left ${
                    selectedCountry.abbr === c.abbr && selectedCountry.code === c.code
                      ? "bg-accent font-medium"
                      : ""
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="text-xs font-mono text-muted-foreground w-10 shrink-0">{c.code}</span>
                  <span className="text-xs truncate">{c.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">{c.abbr}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
