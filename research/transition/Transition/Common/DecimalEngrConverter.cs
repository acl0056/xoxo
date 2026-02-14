using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.UI.Xaml.Data;

namespace Easycoustics.Transition.Common
{
    
    public class DecimalEngrConverter : IValueConverter
    {
        public bool ShortString { get; set; }
        public bool AllowNegativeNumber { get; set; }

        private Dictionary<string, int> prefixes = new Dictionary<string, int>()
                {{ "y", -24 },
                 { "z", -21 },
                 { "a", -18 },
                 { "f", -15 },
                 { "p", -12 },
                 { "n", -9 },
                 { "μ", -6 },
                 { "u", -6 },
                 { "m", -3 },
                 { "k", 3 },
                 { "K", 3 },
                 { "M", 6 },
                 { "G", 9 },
                 { "T", 12 },
                 { "P", 15 },
                 { "E", 18 },
                 { "Z", 21 },
                 { "Y", 24 }};


        private string[] numbers = new string[] { "0", "1", "2", "3", "4", "5", "6", "7", "8", "9" };

        public object Convert(object value, Type targetType, object parameter, string language)
        {
            //number to string
            if (value == null) return "";
            decimal d = (decimal)value;
            if (d == 0m) return (0.0000m).ToString();

            decimal exponent = (int)Math.Floor(Math.Log10((double)Math.Abs(d)));
            decimal output = 0m;
            string prefix = "";
            bool hasPrefix = false;
            bool exponentOutsidePrefixes = false;
            bool negativeExponent = false;


            if (exponent >= 0)
            {
                switch (exponent)
                {
                    case 0:
                    case 1:
                    case 2:
                        output = d; prefix = ""; hasPrefix = false; break;
                    case 3:
                    case 4:
                    case 5:
                        output = (d / 1e3m); prefix = "K"; hasPrefix = true; break;
                    case 6:
                    case 7:
                    case 8:
                        output = (d / 1e6m); prefix = "M"; hasPrefix = true; break;
                    case 9:
                    case 10:
                    case 11:
                        output = (d / 1e9m); prefix = "G"; hasPrefix = true; break;
                    case 12:
                    case 13:
                    case 14:
                        output = (d / 1e12m); prefix = "T"; hasPrefix = true; break;
                    case 15:
                    case 16:
                    case 17:
                        output = (d / 1e15m); prefix = "P"; hasPrefix = true; break;
                    case 18:
                    case 19:
                    case 20:
                        output = (d / 1e18m); prefix = "E"; hasPrefix = true; break;
                    case 21:
                    case 22:
                    case 23:
                        output = (d / 1e21m); prefix = "Z"; hasPrefix = true; break;
                    case 24:
                    case 25:
                    case 26:
                        output = (d / 1e24m); prefix = "Y"; hasPrefix = true; break;
                }

                if (exponent >= 27)
                {
                    exponentOutsidePrefixes = true;
                    output = d / (decimal)Math.Pow(10, (int)exponent);
                }
            }
            else if (exponent < 0)
            {
                negativeExponent = true;

                switch (exponent)
                {
                    case -1:
                    case -2:
                    case -3:
                        output = (d * 1e3m); prefix = "m"; hasPrefix = true; break;
                    case -4:
                    case -5:
                    case -6:
                        output = (d * 1e6m); prefix = "μ"; hasPrefix = true; break;
                    case -7:
                    case -8:
                    case -9:
                        output = (d * 1e9m); prefix = "n"; hasPrefix = true; break;
                    case -10:
                    case -11:
                    case -12:
                        output = (d * 1e12m); prefix = "p"; hasPrefix = true; break;
                    case -13:
                    case -14:
                    case -15:
                        output = (d * 1e15m); prefix = "f"; hasPrefix = true; break;
                    case -16:
                    case -17:
                    case -18:
                        output = (d * 1e18m); prefix = "a"; hasPrefix = true; break;
                    case -19:
                    case -20:
                    case -21:
                        output = (d * 1e21m); prefix = "z"; hasPrefix = true; break;
                    case -22:
                    case -23:
                    case -24:
                        output = (d * 1e24m); prefix = "y"; hasPrefix = true; break;
                }
                if (exponent <= -25)
                {
                    exponentOutsidePrefixes = true;
                    output = d * (decimal)Math.Pow(10, Math.Abs((int)exponent));
                }
            }

            //output = decimal.Round(output, 4);
            string stOutput;

            if (ShortString)
                stOutput = output.ToString("###.####");
            else
                stOutput = output.ToString("##0.0000");

            if (!exponentOutsidePrefixes)
            {
                if (hasPrefix) stOutput += " " + prefix;
            }
            else
                stOutput += "E" + exponent.ToString();

            return stOutput;

        }

        public object ConvertBack(object value, Type targetType, object parameter, string language)
        {
            //string to decimal
            /* here we accept general, engineering and scientific notations */

            bool isEngrNotation = false;

            if (value == null) throw new ArgumentException();

            var valueString = (string)value;
            CultureInfo culture;

            if (language == null)
                culture = CultureInfo.InvariantCulture;
            else
            {
                if (language == "")
                    culture = CultureInfo.InvariantCulture;
                else
                    culture = CultureInfo.GetCultureInfo(language);
            }

            valueString = valueString.Trim();
            if (valueString.Length == 0) throw new ArgumentException();

            string lastChar = valueString.Substring(valueString.Length - 1, 1);

            if (!prefixes.Keys.Contains(lastChar) && !numbers.Contains(lastChar))
                throw new FormatException("Invalid SI Prefix");

            int exponent;

            if (numbers.Contains(lastChar))
                exponent = 0;
            else
            {
                exponent = prefixes[lastChar];
                isEngrNotation = true;
            }

            string valueString2 = isEngrNotation ? valueString.Substring(0, valueString.Length - 1) : valueString;

            decimal result;
            bool didParse = decimal.TryParse(valueString2, NumberStyles.Float, culture, out result);

            if (didParse)
                return result * DecimalMath.PowerN(10m, exponent);
            else
                throw new ArgumentException("Could not parse number");

        }
    }
}
