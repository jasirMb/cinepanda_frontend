import type { ComboboxOption } from "@/components/ui/combobox";

/**
 * Shared country dialing-code data + phone helpers used by every phone input
 * (leads, customers, vendors, labours, staff). Single source of truth on the
 * frontend — mirrors the backend list in `cinepanda_backend/src/utils/phone.ts`.
 */

export const DEFAULT_COUNTRY_CODE = "+91"; // India

export interface CountryCode {
  /** Dialing code stored in the DB, e.g. "+91". */
  code: string;
  /** Country name — used for searching the picker. */
  name: string;
  /** Emoji flag. */
  flag: string;
  /** Shortest valid national-number length (digits only). */
  minLength: number;
  /** Longest valid national-number length (digits only). */
  maxLength: number;
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: "+93", name: "Afghanistan", flag: "🇦🇫", minLength: 9, maxLength: 9 },
  { code: "+358", name: "Åland Islands", flag: "🇦🇽", minLength: 9, maxLength: 9 },
  { code: "+355", name: "Albania", flag: "🇦🇱", minLength: 6, maxLength: 9 },
  { code: "+213", name: "Algeria", flag: "🇩🇿", minLength: 9, maxLength: 9 },
  { code: "+1", name: "American Samoa", flag: "🇦🇸", minLength: 10, maxLength: 10 },
  { code: "+376", name: "Andorra", flag: "🇦🇩", minLength: 6, maxLength: 9 },
  { code: "+244", name: "Angola", flag: "🇦🇴", minLength: 9, maxLength: 9 },
  { code: "+1", name: "Anguilla", flag: "🇦🇮", minLength: 10, maxLength: 10 },
  { code: "+1", name: "Antigua & Barbuda", flag: "🇦🇬", minLength: 10, maxLength: 10 },
  { code: "+54", name: "Argentina", flag: "🇦🇷", minLength: 10, maxLength: 10 },
  { code: "+374", name: "Armenia", flag: "🇦🇲", minLength: 8, maxLength: 8 },
  { code: "+297", name: "Aruba", flag: "🇦🇼", minLength: 7, maxLength: 7 },
  { code: "+247", name: "Ascension Island", flag: "🇦🇨", minLength: 5, maxLength: 6 },
  { code: "+61", name: "Australia", flag: "🇦🇺", minLength: 9, maxLength: 9 },
  { code: "+43", name: "Austria", flag: "🇦🇹", minLength: 10, maxLength: 10 },
  { code: "+994", name: "Azerbaijan", flag: "🇦🇿", minLength: 9, maxLength: 9 },
  { code: "+1", name: "Bahamas", flag: "🇧🇸", minLength: 10, maxLength: 10 },
  { code: "+973", name: "Bahrain", flag: "🇧🇭", minLength: 8, maxLength: 8 },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩", minLength: 10, maxLength: 10 },
  { code: "+1", name: "Barbados", flag: "🇧🇧", minLength: 10, maxLength: 10 },
  { code: "+375", name: "Belarus", flag: "🇧🇾", minLength: 6, maxLength: 11 },
  { code: "+32", name: "Belgium", flag: "🇧🇪", minLength: 9, maxLength: 10 },
  { code: "+501", name: "Belize", flag: "🇧🇿", minLength: 7, maxLength: 11 },
  { code: "+229", name: "Benin", flag: "🇧🇯", minLength: 8, maxLength: 10 },
  { code: "+1", name: "Bermuda", flag: "🇧🇲", minLength: 10, maxLength: 10 },
  { code: "+975", name: "Bhutan", flag: "🇧🇹", minLength: 7, maxLength: 8 },
  { code: "+591", name: "Bolivia", flag: "🇧🇴", minLength: 8, maxLength: 8 },
  { code: "+387", name: "Bosnia & Herzegovina", flag: "🇧🇦", minLength: 8, maxLength: 9 },
  { code: "+267", name: "Botswana", flag: "🇧🇼", minLength: 7, maxLength: 10 },
  { code: "+55", name: "Brazil", flag: "🇧🇷", minLength: 10, maxLength: 11 },
  { code: "+246", name: "British Indian Ocean Territory", flag: "🇮🇴", minLength: 7, maxLength: 7 },
  { code: "+1", name: "British Virgin Islands", flag: "🇻🇬", minLength: 10, maxLength: 10 },
  { code: "+673", name: "Brunei", flag: "🇧🇳", minLength: 7, maxLength: 7 },
  { code: "+359", name: "Bulgaria", flag: "🇧🇬", minLength: 9, maxLength: 9 },
  { code: "+226", name: "Burkina Faso", flag: "🇧🇫", minLength: 8, maxLength: 8 },
  { code: "+257", name: "Burundi", flag: "🇧🇮", minLength: 8, maxLength: 8 },
  { code: "+855", name: "Cambodia", flag: "🇰🇭", minLength: 8, maxLength: 10 },
  { code: "+237", name: "Cameroon", flag: "🇨🇲", minLength: 9, maxLength: 9 },
  { code: "+1", name: "Canada", flag: "🇨🇦", minLength: 10, maxLength: 10 },
  { code: "+238", name: "Cape Verde", flag: "🇨🇻", minLength: 7, maxLength: 7 },
  { code: "+599", name: "Caribbean Netherlands", flag: "🇧🇶", minLength: 7, maxLength: 8 },
  { code: "+1", name: "Cayman Islands", flag: "🇰🇾", minLength: 10, maxLength: 10 },
  { code: "+236", name: "Central African Republic", flag: "🇨🇫", minLength: 8, maxLength: 8 },
  { code: "+235", name: "Chad", flag: "🇹🇩", minLength: 8, maxLength: 8 },
  { code: "+56", name: "Chile", flag: "🇨🇱", minLength: 9, maxLength: 10 },
  { code: "+86", name: "China", flag: "🇨🇳", minLength: 10, maxLength: 11 },
  { code: "+61", name: "Christmas Island", flag: "🇨🇽", minLength: 9, maxLength: 9 },
  { code: "+61", name: "Cocos (Keeling) Islands", flag: "🇨🇨", minLength: 9, maxLength: 9 },
  { code: "+57", name: "Colombia", flag: "🇨🇴", minLength: 10, maxLength: 10 },
  { code: "+269", name: "Comoros", flag: "🇰🇲", minLength: 7, maxLength: 7 },
  { code: "+242", name: "Congo - Brazzaville", flag: "🇨🇬", minLength: 9, maxLength: 9 },
  { code: "+243", name: "Congo - Kinshasa", flag: "🇨🇩", minLength: 7, maxLength: 10 },
  { code: "+682", name: "Cook Islands", flag: "🇨🇰", minLength: 5, maxLength: 5 },
  { code: "+506", name: "Costa Rica", flag: "🇨🇷", minLength: 8, maxLength: 10 },
  { code: "+225", name: "Côte d’Ivoire", flag: "🇨🇮", minLength: 10, maxLength: 10 },
  { code: "+385", name: "Croatia", flag: "🇭🇷", minLength: 9, maxLength: 9 },
  { code: "+53", name: "Cuba", flag: "🇨🇺", minLength: 6, maxLength: 10 },
  { code: "+599", name: "Curaçao", flag: "🇨🇼", minLength: 7, maxLength: 8 },
  { code: "+357", name: "Cyprus", flag: "🇨🇾", minLength: 8, maxLength: 8 },
  { code: "+420", name: "Czechia", flag: "🇨🇿", minLength: 9, maxLength: 9 },
  { code: "+45", name: "Denmark", flag: "🇩🇰", minLength: 8, maxLength: 8 },
  { code: "+253", name: "Djibouti", flag: "🇩🇯", minLength: 8, maxLength: 8 },
  { code: "+1", name: "Dominica", flag: "🇩🇲", minLength: 10, maxLength: 10 },
  { code: "+1", name: "Dominican Republic", flag: "🇩🇴", minLength: 10, maxLength: 10 },
  { code: "+593", name: "Ecuador", flag: "🇪🇨", minLength: 9, maxLength: 10 },
  { code: "+20", name: "Egypt", flag: "🇪🇬", minLength: 10, maxLength: 10 },
  { code: "+503", name: "El Salvador", flag: "🇸🇻", minLength: 7, maxLength: 11 },
  { code: "+240", name: "Equatorial Guinea", flag: "🇬🇶", minLength: 9, maxLength: 9 },
  { code: "+291", name: "Eritrea", flag: "🇪🇷", minLength: 7, maxLength: 7 },
  { code: "+372", name: "Estonia", flag: "🇪🇪", minLength: 7, maxLength: 10 },
  { code: "+268", name: "Eswatini", flag: "🇸🇿", minLength: 8, maxLength: 9 },
  { code: "+251", name: "Ethiopia", flag: "🇪🇹", minLength: 9, maxLength: 10 },
  { code: "+500", name: "Falkland Islands", flag: "🇫🇰", minLength: 5, maxLength: 5 },
  { code: "+298", name: "Faroe Islands", flag: "🇫🇴", minLength: 6, maxLength: 6 },
  { code: "+679", name: "Fiji", flag: "🇫🇯", minLength: 7, maxLength: 7 },
  { code: "+358", name: "Finland", flag: "🇫🇮", minLength: 9, maxLength: 9 },
  { code: "+33", name: "France", flag: "🇫🇷", minLength: 9, maxLength: 9 },
  { code: "+594", name: "French Guiana", flag: "🇬🇫", minLength: 9, maxLength: 9 },
  { code: "+689", name: "French Polynesia", flag: "🇵🇫", minLength: 6, maxLength: 9 },
  { code: "+241", name: "Gabon", flag: "🇬🇦", minLength: 7, maxLength: 8 },
  { code: "+220", name: "Gambia", flag: "🇬🇲", minLength: 7, maxLength: 7 },
  { code: "+995", name: "Georgia", flag: "🇬🇪", minLength: 9, maxLength: 9 },
  { code: "+49", name: "Germany", flag: "🇩🇪", minLength: 10, maxLength: 11 },
  { code: "+233", name: "Ghana", flag: "🇬🇭", minLength: 9, maxLength: 10 },
  { code: "+350", name: "Gibraltar", flag: "🇬🇮", minLength: 8, maxLength: 8 },
  { code: "+30", name: "Greece", flag: "🇬🇷", minLength: 10, maxLength: 10 },
  { code: "+299", name: "Greenland", flag: "🇬🇱", minLength: 6, maxLength: 6 },
  { code: "+1", name: "Grenada", flag: "🇬🇩", minLength: 10, maxLength: 10 },
  { code: "+590", name: "Guadeloupe", flag: "🇬🇵", minLength: 9, maxLength: 9 },
  { code: "+1", name: "Guam", flag: "🇬🇺", minLength: 10, maxLength: 10 },
  { code: "+502", name: "Guatemala", flag: "🇬🇹", minLength: 8, maxLength: 11 },
  { code: "+44", name: "Guernsey", flag: "🇬🇬", minLength: 10, maxLength: 11 },
  { code: "+224", name: "Guinea", flag: "🇬🇳", minLength: 8, maxLength: 9 },
  { code: "+245", name: "Guinea-Bissau", flag: "🇬🇼", minLength: 7, maxLength: 9 },
  { code: "+592", name: "Guyana", flag: "🇬🇾", minLength: 7, maxLength: 7 },
  { code: "+509", name: "Haiti", flag: "🇭🇹", minLength: 8, maxLength: 8 },
  { code: "+504", name: "Honduras", flag: "🇭🇳", minLength: 8, maxLength: 11 },
  { code: "+852", name: "Hong Kong SAR China", flag: "🇭🇰", minLength: 5, maxLength: 11 },
  { code: "+36", name: "Hungary", flag: "🇭🇺", minLength: 9, maxLength: 9 },
  { code: "+354", name: "Iceland", flag: "🇮🇸", minLength: 7, maxLength: 9 },
  { code: "+91", name: "India", flag: "🇮🇳", minLength: 10, maxLength: 10 },
  { code: "+62", name: "Indonesia", flag: "🇮🇩", minLength: 9, maxLength: 12 },
  { code: "+98", name: "Iran", flag: "🇮🇷", minLength: 4, maxLength: 10 },
  { code: "+964", name: "Iraq", flag: "🇮🇶", minLength: 8, maxLength: 10 },
  { code: "+353", name: "Ireland", flag: "🇮🇪", minLength: 9, maxLength: 9 },
  { code: "+44", name: "Isle of Man", flag: "🇮🇲", minLength: 10, maxLength: 11 },
  { code: "+972", name: "Israel", flag: "🇮🇱", minLength: 9, maxLength: 10 },
  { code: "+39", name: "Italy", flag: "🇮🇹", minLength: 10, maxLength: 10 },
  { code: "+1", name: "Jamaica", flag: "🇯🇲", minLength: 10, maxLength: 10 },
  { code: "+81", name: "Japan", flag: "🇯🇵", minLength: 9, maxLength: 10 },
  { code: "+44", name: "Jersey", flag: "🇯🇪", minLength: 10, maxLength: 11 },
  { code: "+962", name: "Jordan", flag: "🇯🇴", minLength: 8, maxLength: 9 },
  { code: "+7", name: "Kazakhstan", flag: "🇰🇿", minLength: 10, maxLength: 10 },
  { code: "+254", name: "Kenya", flag: "🇰🇪", minLength: 9, maxLength: 10 },
  { code: "+686", name: "Kiribati", flag: "🇰🇮", minLength: 5, maxLength: 8 },
  { code: "+383", name: "Kosovo", flag: "🇽🇰", minLength: 8, maxLength: 12 },
  { code: "+965", name: "Kuwait", flag: "🇰🇼", minLength: 8, maxLength: 8 },
  { code: "+996", name: "Kyrgyzstan", flag: "🇰🇬", minLength: 9, maxLength: 10 },
  { code: "+856", name: "Laos", flag: "🇱🇦", minLength: 8, maxLength: 10 },
  { code: "+371", name: "Latvia", flag: "🇱🇻", minLength: 8, maxLength: 8 },
  { code: "+961", name: "Lebanon", flag: "🇱🇧", minLength: 7, maxLength: 8 },
  { code: "+266", name: "Lesotho", flag: "🇱🇸", minLength: 8, maxLength: 8 },
  { code: "+231", name: "Liberia", flag: "🇱🇷", minLength: 7, maxLength: 9 },
  { code: "+218", name: "Libya", flag: "🇱🇾", minLength: 9, maxLength: 9 },
  { code: "+423", name: "Liechtenstein", flag: "🇱🇮", minLength: 7, maxLength: 9 },
  { code: "+370", name: "Lithuania", flag: "🇱🇹", minLength: 8, maxLength: 8 },
  { code: "+352", name: "Luxembourg", flag: "🇱🇺", minLength: 4, maxLength: 11 },
  { code: "+853", name: "Macao SAR China", flag: "🇲🇴", minLength: 7, maxLength: 8 },
  { code: "+261", name: "Madagascar", flag: "🇲🇬", minLength: 9, maxLength: 9 },
  { code: "+265", name: "Malawi", flag: "🇲🇼", minLength: 7, maxLength: 9 },
  { code: "+60", name: "Malaysia", flag: "🇲🇾", minLength: 9, maxLength: 10 },
  { code: "+960", name: "Maldives", flag: "🇲🇻", minLength: 7, maxLength: 10 },
  { code: "+223", name: "Mali", flag: "🇲🇱", minLength: 8, maxLength: 8 },
  { code: "+356", name: "Malta", flag: "🇲🇹", minLength: 8, maxLength: 8 },
  { code: "+692", name: "Marshall Islands", flag: "🇲🇭", minLength: 7, maxLength: 7 },
  { code: "+596", name: "Martinique", flag: "🇲🇶", minLength: 9, maxLength: 9 },
  { code: "+222", name: "Mauritania", flag: "🇲🇷", minLength: 8, maxLength: 8 },
  { code: "+230", name: "Mauritius", flag: "🇲🇺", minLength: 7, maxLength: 10 },
  { code: "+262", name: "Mayotte", flag: "🇾🇹", minLength: 9, maxLength: 9 },
  { code: "+52", name: "Mexico", flag: "🇲🇽", minLength: 10, maxLength: 10 },
  { code: "+691", name: "Micronesia", flag: "🇫🇲", minLength: 7, maxLength: 7 },
  { code: "+373", name: "Moldova", flag: "🇲🇩", minLength: 8, maxLength: 8 },
  { code: "+377", name: "Monaco", flag: "🇲🇨", minLength: 8, maxLength: 9 },
  { code: "+976", name: "Mongolia", flag: "🇲🇳", minLength: 8, maxLength: 10 },
  { code: "+382", name: "Montenegro", flag: "🇲🇪", minLength: 8, maxLength: 9 },
  { code: "+1", name: "Montserrat", flag: "🇲🇸", minLength: 10, maxLength: 10 },
  { code: "+212", name: "Morocco", flag: "🇲🇦", minLength: 9, maxLength: 10 },
  { code: "+258", name: "Mozambique", flag: "🇲🇿", minLength: 9, maxLength: 9 },
  { code: "+95", name: "Myanmar (Burma)", flag: "🇲🇲", minLength: 6, maxLength: 10 },
  { code: "+264", name: "Namibia", flag: "🇳🇦", minLength: 8, maxLength: 9 },
  { code: "+674", name: "Nauru", flag: "🇳🇷", minLength: 7, maxLength: 7 },
  { code: "+977", name: "Nepal", flag: "🇳🇵", minLength: 8, maxLength: 11 },
  { code: "+31", name: "Netherlands", flag: "🇳🇱", minLength: 9, maxLength: 9 },
  { code: "+687", name: "New Caledonia", flag: "🇳🇨", minLength: 6, maxLength: 6 },
  { code: "+64", name: "New Zealand", flag: "🇳🇿", minLength: 9, maxLength: 10 },
  { code: "+505", name: "Nicaragua", flag: "🇳🇮", minLength: 8, maxLength: 8 },
  { code: "+227", name: "Niger", flag: "🇳🇪", minLength: 8, maxLength: 8 },
  { code: "+234", name: "Nigeria", flag: "🇳🇬", minLength: 10, maxLength: 10 },
  { code: "+683", name: "Niue", flag: "🇳🇺", minLength: 4, maxLength: 7 },
  { code: "+672", name: "Norfolk Island", flag: "🇳🇫", minLength: 6, maxLength: 6 },
  { code: "+850", name: "North Korea", flag: "🇰🇵", minLength: 8, maxLength: 10 },
  { code: "+389", name: "North Macedonia", flag: "🇲🇰", minLength: 8, maxLength: 8 },
  { code: "+1", name: "Northern Mariana Islands", flag: "🇲🇵", minLength: 10, maxLength: 10 },
  { code: "+47", name: "Norway", flag: "🇳🇴", minLength: 8, maxLength: 8 },
  { code: "+968", name: "Oman", flag: "🇴🇲", minLength: 8, maxLength: 8 },
  { code: "+92", name: "Pakistan", flag: "🇵🇰", minLength: 10, maxLength: 10 },
  { code: "+680", name: "Palau", flag: "🇵🇼", minLength: 7, maxLength: 7 },
  { code: "+970", name: "Palestinian Territories", flag: "🇵🇸", minLength: 8, maxLength: 10 },
  { code: "+507", name: "Panama", flag: "🇵🇦", minLength: 7, maxLength: 11 },
  { code: "+675", name: "Papua New Guinea", flag: "🇵🇬", minLength: 8, maxLength: 8 },
  { code: "+595", name: "Paraguay", flag: "🇵🇾", minLength: 9, maxLength: 10 },
  { code: "+51", name: "Peru", flag: "🇵🇪", minLength: 9, maxLength: 10 },
  { code: "+63", name: "Philippines", flag: "🇵🇭", minLength: 10, maxLength: 10 },
  { code: "+48", name: "Poland", flag: "🇵🇱", minLength: 9, maxLength: 9 },
  { code: "+351", name: "Portugal", flag: "🇵🇹", minLength: 9, maxLength: 9 },
  { code: "+1", name: "Puerto Rico", flag: "🇵🇷", minLength: 10, maxLength: 10 },
  { code: "+974", name: "Qatar", flag: "🇶🇦", minLength: 8, maxLength: 8 },
  { code: "+262", name: "Réunion", flag: "🇷🇪", minLength: 9, maxLength: 9 },
  { code: "+40", name: "Romania", flag: "🇷🇴", minLength: 10, maxLength: 10 },
  { code: "+7", name: "Russia", flag: "🇷🇺", minLength: 10, maxLength: 10 },
  { code: "+250", name: "Rwanda", flag: "🇷🇼", minLength: 8, maxLength: 9 },
  { code: "+685", name: "Samoa", flag: "🇼🇸", minLength: 5, maxLength: 10 },
  { code: "+378", name: "San Marino", flag: "🇸🇲", minLength: 8, maxLength: 10 },
  { code: "+239", name: "São Tomé & Príncipe", flag: "🇸🇹", minLength: 7, maxLength: 7 },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦", minLength: 8, maxLength: 9 },
  { code: "+221", name: "Senegal", flag: "🇸🇳", minLength: 9, maxLength: 9 },
  { code: "+381", name: "Serbia", flag: "🇷🇸", minLength: 6, maxLength: 12 },
  { code: "+248", name: "Seychelles", flag: "🇸🇨", minLength: 7, maxLength: 7 },
  { code: "+232", name: "Sierra Leone", flag: "🇸🇱", minLength: 8, maxLength: 8 },
  { code: "+65", name: "Singapore", flag: "🇸🇬", minLength: 8, maxLength: 8 },
  { code: "+1", name: "Sint Maarten", flag: "🇸🇽", minLength: 10, maxLength: 10 },
  { code: "+421", name: "Slovakia", flag: "🇸🇰", minLength: 6, maxLength: 9 },
  { code: "+386", name: "Slovenia", flag: "🇸🇮", minLength: 5, maxLength: 8 },
  { code: "+677", name: "Solomon Islands", flag: "🇸🇧", minLength: 5, maxLength: 7 },
  { code: "+252", name: "Somalia", flag: "🇸🇴", minLength: 6, maxLength: 9 },
  { code: "+27", name: "South Africa", flag: "🇿🇦", minLength: 9, maxLength: 9 },
  { code: "+82", name: "South Korea", flag: "🇰🇷", minLength: 9, maxLength: 10 },
  { code: "+211", name: "South Sudan", flag: "🇸🇸", minLength: 9, maxLength: 9 },
  { code: "+34", name: "Spain", flag: "🇪🇸", minLength: 9, maxLength: 9 },
  { code: "+94", name: "Sri Lanka", flag: "🇱🇰", minLength: 9, maxLength: 10 },
  { code: "+590", name: "St. Barthélemy", flag: "🇧🇱", minLength: 9, maxLength: 9 },
  { code: "+290", name: "St. Helena", flag: "🇸🇭", minLength: 4, maxLength: 5 },
  { code: "+1", name: "St. Kitts & Nevis", flag: "🇰🇳", minLength: 10, maxLength: 10 },
  { code: "+1", name: "St. Lucia", flag: "🇱🇨", minLength: 10, maxLength: 10 },
  { code: "+590", name: "St. Martin", flag: "🇲🇫", minLength: 9, maxLength: 9 },
  { code: "+508", name: "St. Pierre & Miquelon", flag: "🇵🇲", minLength: 6, maxLength: 9 },
  { code: "+1", name: "St. Vincent & Grenadines", flag: "🇻🇨", minLength: 10, maxLength: 10 },
  { code: "+249", name: "Sudan", flag: "🇸🇩", minLength: 9, maxLength: 9 },
  { code: "+597", name: "Suriname", flag: "🇸🇷", minLength: 6, maxLength: 7 },
  { code: "+47", name: "Svalbard & Jan Mayen", flag: "🇸🇯", minLength: 8, maxLength: 8 },
  { code: "+46", name: "Sweden", flag: "🇸🇪", minLength: 9, maxLength: 10 },
  { code: "+41", name: "Switzerland", flag: "🇨🇭", minLength: 9, maxLength: 9 },
  { code: "+963", name: "Syria", flag: "🇸🇾", minLength: 8, maxLength: 9 },
  { code: "+886", name: "Taiwan", flag: "🇹🇼", minLength: 7, maxLength: 11 },
  { code: "+992", name: "Tajikistan", flag: "🇹🇯", minLength: 9, maxLength: 9 },
  { code: "+255", name: "Tanzania", flag: "🇹🇿", minLength: 9, maxLength: 10 },
  { code: "+66", name: "Thailand", flag: "🇹🇭", minLength: 9, maxLength: 10 },
  { code: "+670", name: "Timor-Leste", flag: "🇹🇱", minLength: 7, maxLength: 8 },
  { code: "+228", name: "Togo", flag: "🇹🇬", minLength: 8, maxLength: 8 },
  { code: "+690", name: "Tokelau", flag: "🇹🇰", minLength: 4, maxLength: 7 },
  { code: "+676", name: "Tonga", flag: "🇹🇴", minLength: 5, maxLength: 7 },
  { code: "+1", name: "Trinidad & Tobago", flag: "🇹🇹", minLength: 10, maxLength: 10 },
  { code: "+290", name: "Tristan da Cunha", flag: "🇹🇦", minLength: 4, maxLength: 5 },
  { code: "+216", name: "Tunisia", flag: "🇹🇳", minLength: 8, maxLength: 8 },
  { code: "+90", name: "Türkiye", flag: "🇹🇷", minLength: 10, maxLength: 10 },
  { code: "+993", name: "Turkmenistan", flag: "🇹🇲", minLength: 8, maxLength: 8 },
  { code: "+1", name: "Turks & Caicos Islands", flag: "🇹🇨", minLength: 10, maxLength: 10 },
  { code: "+688", name: "Tuvalu", flag: "🇹🇻", minLength: 5, maxLength: 5 },
  { code: "+1", name: "U.S. Virgin Islands", flag: "🇻🇮", minLength: 10, maxLength: 10 },
  { code: "+256", name: "Uganda", flag: "🇺🇬", minLength: 9, maxLength: 9 },
  { code: "+380", name: "Ukraine", flag: "🇺🇦", minLength: 9, maxLength: 9 },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪", minLength: 8, maxLength: 9 },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧", minLength: 10, maxLength: 11 },
  { code: "+1", name: "United States", flag: "🇺🇸", minLength: 10, maxLength: 10 },
  { code: "+598", name: "Uruguay", flag: "🇺🇾", minLength: 8, maxLength: 8 },
  { code: "+998", name: "Uzbekistan", flag: "🇺🇿", minLength: 9, maxLength: 9 },
  { code: "+678", name: "Vanuatu", flag: "🇻🇺", minLength: 5, maxLength: 7 },
  { code: "+39", name: "Vatican City", flag: "🇻🇦", minLength: 10, maxLength: 10 },
  { code: "+58", name: "Venezuela", flag: "🇻🇪", minLength: 10, maxLength: 10 },
  { code: "+84", name: "Vietnam", flag: "🇻🇳", minLength: 9, maxLength: 10 },
  { code: "+681", name: "Wallis & Futuna", flag: "🇼🇫", minLength: 6, maxLength: 9 },
  { code: "+212", name: "Western Sahara", flag: "🇪🇭", minLength: 9, maxLength: 10 },
  { code: "+967", name: "Yemen", flag: "🇾🇪", minLength: 7, maxLength: 9 },
  { code: "+260", name: "Zambia", flag: "🇿🇲", minLength: 10, maxLength: 10 },
  { code: "+263", name: "Zimbabwe", flag: "🇿🇼", minLength: 9, maxLength: 10 },
];

/** Look up a country by its dialing code (first match for shared codes like +1). */
export function getCountryByCode(code?: string | null): CountryCode | undefined {
  if (!code) return undefined;
  return COUNTRY_CODES.find((c) => c.code === code);
}

/**
 * Validate a national number against its country's length range (digits only).
 * Unknown country codes fall back to a lenient 4–15 digit E.164 check.
 */
export function isValidPhoneForCountry(
  phone: string,
  countryCode?: string | null
): boolean {
  const cleaned = (phone ?? "").replace(/\D/g, "");
  const country = getCountryByCode(countryCode);
  if (!country) return cleaned.length >= 4 && cleaned.length <= 15;
  return cleaned.length >= country.minLength && cleaned.length <= country.maxLength;
}

/** Human-readable expected length, e.g. "10 digits" or "8–9 digits". */
export function expectedPhoneLength(countryCode?: string | null): string {
  const country = getCountryByCode(countryCode);
  if (!country) return "4–15 digits";
  return country.minLength === country.maxLength
    ? `${country.minLength} digits`
    : `${country.minLength}–${country.maxLength} digits`;
}

/**
 * Options for the searchable Combobox. The trigger shows a compact
 * "🇮🇳 +91", while the `hint` (country name) keeps the list searchable by name.
 */
// Most prominent country for a shared dialing code (e.g. +1 is used by ~25
// countries) — it supplies the flag/label shown for that code in the picker.
const PRIMARY_COUNTRY: Record<string, string> = {
  "+1": "United States",
  "+7": "Russia",
  "+44": "United Kingdom",
  "+39": "Italy",
  "+47": "Norway",
  "+61": "Australia",
  "+212": "Morocco",
  "+262": "Réunion",
  "+358": "Finland",
  "+590": "Guadeloupe",
  "+599": "Curaçao",
};

/**
 * Options for the searchable Combobox — one row per dialing code. Countries that
 * share a code collapse into a single row (labelled with the primary country);
 * every member name goes into the `hint` so search still finds them (typing
 * "Jamaica" matches the +1 row). The trigger shows a compact "🇺🇸 +1".
 */
export const COUNTRY_CODE_OPTIONS: ComboboxOption[] = (() => {
  const byCode = new Map<string, CountryCode[]>();
  for (const c of COUNTRY_CODES) {
    const group = byCode.get(c.code);
    if (group) group.push(c);
    else byCode.set(c.code, [c]);
  }
  const options: Array<ComboboxOption & { sortName: string }> = [];
  for (const [code, members] of byCode) {
    const primary =
      members.find((m) => m.name === PRIMARY_COUNTRY[code]) ?? members[0];
    options.push({
      value: code,
      label: `${primary.flag} ${code}`,
      hint: members.map((m) => m.name).join(", "),
      sortName: primary.name,
    });
  }
  return options
    .sort((a, b) => a.sortName.localeCompare(b.sortName))
    .map(({ sortName: _sortName, ...o }) => o);
})();

// Pure dialing codes (no NANP "+1-242" style sub-codes) in digit form, sorted
// longest-first so smart-paste matches the most specific code first.
const DIAL_PREFIXES = COUNTRY_CODES.filter((c) => !c.code.includes("-"))
  .map((c) => ({ code: c.code, digits: c.code.replace(/\D/g, "") }))
  .sort((a, b) => b.digits.length - a.digits.length);

export interface ParsedPhone {
  /** Detected dialing code, or null when the input had no explicit "+"/"00". */
  countryCode: string | null;
  /** The remaining national number, digits only. */
  number: string;
}

/**
 * Parse a pasted phone string. Only extracts a country code when the value
 * explicitly starts with "+" or "00" (e.g. "+91 12345 12345" → code "+91",
 * number "1234512345"). A plain local number is returned untouched (digits
 * only) so we never strip leading digits from a number that has no code.
 */
export function parsePhonePaste(raw: string): ParsedPhone {
  let s = raw.trim();
  if (s.startsWith("00")) s = "+" + s.slice(2);

  if (s.startsWith("+")) {
    const digits = s.slice(1).replace(/\D/g, "");
    const match = DIAL_PREFIXES.find((p) => digits.startsWith(p.digits));
    if (match) {
      return { countryCode: match.code, number: digits.slice(match.digits.length) };
    }
    return { countryCode: null, number: digits };
  }

  return { countryCode: null, number: s.replace(/\D/g, "") };
}

/** Display form, e.g. "+91 9876543210". Returns "" when there is no number. */
export function formatPhone(
  countryCode?: string | null,
  phone?: string | null
): string {
  if (!phone) return "";
  const code = countryCode?.trim();
  return code ? `${code} ${phone}` : phone;
}

/** `tel:` href, e.g. "tel:+919876543210". */
export function telHref(
  countryCode?: string | null,
  phone?: string | null
): string {
  const code = (countryCode ?? "").replace(/[^\d+]/g, "");
  const num = (phone ?? "").replace(/\D/g, "");
  return `tel:${code}${num}`;
}
