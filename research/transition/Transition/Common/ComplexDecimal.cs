using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Windows.UI.Xaml.Data;

namespace Easycoustics.Transition.Common
{
    [Windows.Foundation.Metadata.CreateFromString(MethodName = "Easycoustics.Transition.Common.ComplexDecimal.Parse")]
    public struct ComplexDecimal : IEquatable<ComplexDecimal>, IFormattable
    {
        public decimal RealPart { get; }
        public decimal ImaginaryPart { get; }

        public decimal Magnitude { get => Modulus(this); }
        public decimal Phase { get => Argument(this); }
        public decimal PhaseDeg { get => (Argument(this) * 180) / DecimalMath.Pi; }

        public ComplexDecimal Reciprocal { get => GetReciprocal(this); }
        public ComplexDecimal Conjugate { get => new ComplexDecimal(RealPart, -1m * ImaginaryPart); }

        public double TodBV { get => TodBRef(1); }
        public double TodBm { get => TodBRef(774.6E-3); }
        public double TodBSPL { get => TodBRef(20E-6); }
        public double TodBPa { get => TodBRef(1); }

        public double MagnitudeDouble { get => Convert.ToDouble(Magnitude); }
        public double PhaseDegDouble { get => Convert.ToDouble(PhaseDeg); }

        public static readonly ComplexDecimal Zero = new ComplexDecimal(0, 0);
        public static readonly ComplexDecimal One = new ComplexDecimal(1m, 0);
        public static readonly ComplexDecimal ImaginaryOne = new ComplexDecimal(0, 1m);

        public bool IsZero { get => (ImaginaryPart == 0m) && (RealPart == 0); }
        public bool IsReal { get => ImaginaryPart == 0m; }
        public bool IsImag { get => RealPart == 0m; }

        public ComplexDecimal(decimal real, decimal imag)
        {
            RealPart = real;
            ImaginaryPart = imag;
        }

        public ComplexDecimal(decimal real)
        {
            RealPart = real;
            ImaginaryPart = 0m;
        }

        public double TodBRef(double reference)
        { return TodBRef(this, reference); }

        public static double TodBRef(ComplexDecimal number, double reference)
        {
            return 20 * Math.Log10(Convert.ToDouble(number.Magnitude) / reference);
        }

        public ComplexDecimal(double real, double imag)
        {
            RealPart = (decimal)real;
            ImaginaryPart = (decimal)imag;
        }

        public ComplexDecimal(double real)
        {
            RealPart = (decimal)real;
            ImaginaryPart = 0m;
        }

        public ComplexDecimal(int real, int imag)
        {
            RealPart = (decimal)real;
            ImaginaryPart = (decimal)imag;
        }

        public ComplexDecimal(int real)
        {
            RealPart = (decimal)real;
            ImaginaryPart = 0m;
        }

        public static ComplexDecimal GetReciprocal(ComplexDecimal input)
        {
            if (input.IsZero)
                return new ComplexDecimal(decimal.MaxValue, 0m);
            else return One / input;
        }

        public static ComplexDecimal Negate(ComplexDecimal input) => -1 * input;
        public static ComplexDecimal Add(ComplexDecimal n1, ComplexDecimal n2)
        {
            return new ComplexDecimal(n1.RealPart + n2.RealPart, n1.ImaginaryPart + n2.ImaginaryPart);
        }

        public static ComplexDecimal Substract(ComplexDecimal n1, ComplexDecimal n2)
        {
            return new ComplexDecimal(n1.RealPart - n2.RealPart, n1.ImaginaryPart - n2.ImaginaryPart);
        }

        public static ComplexDecimal Product(ComplexDecimal n1, ComplexDecimal n2)
        {
            decimal a = n1.RealPart;
            decimal b = n1.ImaginaryPart;
            decimal c = n2.RealPart;
            decimal d = n2.ImaginaryPart;
            
            return new ComplexDecimal((a * c) - (b * d), (a * d) + (b * c));
        }

        public static ComplexDecimal Divide(ComplexDecimal dividend, ComplexDecimal divisor)
        {
            decimal a = dividend.RealPart;
            decimal b = dividend.ImaginaryPart;
            decimal c = divisor.RealPart;
            decimal d = divisor.ImaginaryPart;

            decimal real = ((a * c) + (b * d)) / ((c * c) + (d * d));
            decimal imag = ((b * c) - (a * d)) / ((c * c) + (d * d));

            return new ComplexDecimal(real, imag);
        }

        public static decimal Modulus(ComplexDecimal number)
        {
            return DecimalMath.Sqrt((number.RealPart * number.RealPart) + (number.ImaginaryPart * number.ImaginaryPart));
        }

        public static decimal Argument(ComplexDecimal number)
        {
            if (number.RealPart == 0m)
            {
                if (number.ImaginaryPart > 0) return DecimalMath.PIdiv2;
                else if (number.ImaginaryPart == 0) return 0m;
                else /*  number.ImaginaryPart < 0 */ return -1 * DecimalMath.PIdiv2; 
            }

            return DecimalMath.Atan2(number.ImaginaryPart, number.RealPart);
        }

        public static ComplexDecimal Parallel(ComplexDecimal z1, ComplexDecimal z2)
        {
            /* this is used for paralleling impedances */

            if (z1.Magnitude == 0m || z2.Magnitude == 0m) return 0m;

            return (z1.Reciprocal + z2.Reciprocal).Reciprocal;
        }

        public static ComplexDecimal Exp(ComplexDecimal number)
        {
            decimal realPart = DecimalMath.Exp(number.RealPart);

            ComplexDecimal imaginaryPart = new ComplexDecimal(DecimalMath.Cos(number.ImaginaryPart), DecimalMath.Sin(number.ImaginaryPart));

            return Product(realPart, imaginaryPart);
        }

        public static ComplexDecimal Pow(ComplexDecimal value, ComplexDecimal power)
        {
            decimal a = value.RealPart;
            decimal b = value.ImaginaryPart;
            decimal c = power.RealPart;
            decimal d = power.ImaginaryPart;

            decimal p = DecimalMath.Power((a * a) + (b * b), c / 2) * DecimalMath.Exp(-d * Argument(value));
            decimal q = (c * Argument(value)) + (0.5m * d * DecimalMath.Log((a * a) + (b * b)));

            return new ComplexDecimal(p * DecimalMath.Cos(q), p * DecimalMath.Sin(q));
        }

        public static ComplexDecimal Sqrt(ComplexDecimal value)
        {
            return ComplexDecimal.Pow(value, .5m);
        }

        public static ComplexDecimal Log(ComplexDecimal value)
        {
            /* e base logarithm */
            return DecimalMath.Log(value.Magnitude) + (ImaginaryOne * value.Phase);
        }

        public static ComplexDecimal operator +(ComplexDecimal n1, ComplexDecimal n2) { return Add(n1, n2); }
        public static ComplexDecimal operator -(ComplexDecimal n1, ComplexDecimal n2) { return Substract(n1, n2); }
        public static ComplexDecimal operator *(ComplexDecimal n1, ComplexDecimal n2) { return Product(n1, n2); }
        public static ComplexDecimal operator /(ComplexDecimal n1, ComplexDecimal n2) { return Divide(n1, n2); }

        public static ComplexDecimal operator |(ComplexDecimal n1, ComplexDecimal n2) { return Parallel(n1, n2); }

        public static ComplexDecimal operator -(ComplexDecimal n1) { return n1 * -1; }
        public static ComplexDecimal operator +(ComplexDecimal n1) { return n1; }

        public static bool operator ==(ComplexDecimal n1, ComplexDecimal n2)
        { return (n1.RealPart == n2.RealPart) && (n1.ImaginaryPart == n2.ImaginaryPart); }

        public static bool operator !=(ComplexDecimal n1, ComplexDecimal n2)
        { return (n1.RealPart != n2.RealPart) || (n1.ImaginaryPart != n2.ImaginaryPart); }

        public static implicit operator ComplexDecimal(decimal value)
        {
            return new ComplexDecimal(value, 0m);
        }

        public static implicit operator ComplexDecimal(double value)
        {
            return new ComplexDecimal(value, 0);
        }

        public static implicit operator ComplexDecimal(int value)
        {
            return new ComplexDecimal(value, 0);
        }

        public static implicit operator ComplexDecimal(Complex value)
        {
            return new ComplexDecimal(value.Real, value.Imaginary);
        }

        public static explicit operator Complex(ComplexDecimal value)
        {
            return new Complex(Convert.ToDouble(value.RealPart), Convert.ToDouble(value.ImaginaryPart));
        }

        public static ComplexDecimal FromPolar(decimal modulus, decimal argument)
        {
            decimal realPart = modulus * DecimalMath.Cos(argument);
            decimal imagPart = modulus * DecimalMath.Sin(argument);

            return new ComplexDecimal(realPart, imagPart);
        }
        
        public override bool Equals(object obj)
        {
            if (ReferenceEquals(null, obj))
                return false;

            return obj is ComplexDecimal && Equals((ComplexDecimal)obj);
        }

        public override int GetHashCode()
        {
            unchecked
            {
                return (RealPart.GetHashCode() * 397) ^ Convert.ToInt32(ImaginaryPart * 398);
            }
        }

        public bool Equals(ComplexDecimal other)
        {
            return this == other;
        }

        public string ToString(string format, IFormatProvider formatProvider)
        {
            return ToString(format, formatProvider, "i");

        }

        public string ToString(string format, IFormatProvider formatProvider, string imaginarySymbol)
        {
            if (formatProvider == null) formatProvider = CultureInfo.CurrentCulture;
            if (imaginarySymbol == null) imaginarySymbol = "i";

            string output = "";
            output += RealPart.ToString(format, formatProvider) + " ";

            if (ImaginaryPart < 0m)
                output += ImaginaryPart.ToString(format, formatProvider);
            else
                output += "+" + ImaginaryPart.ToString(format, formatProvider) + imaginarySymbol;

            return output;
        }

        public override string ToString()
        {
            return ToString("G", CultureInfo.CurrentCulture);
        }

        public string ToString(string format)
        {
            return ToString(format, CultureInfo.CurrentCulture);
        }

        public string ToString(IFormatProvider formatProvider)
        {
            return ToString("G", formatProvider);
        }

        public static ComplexDecimal Parse(string input)
        {
            return Parse(input, CultureInfo.CurrentCulture, "i");
        }

        public static ComplexDecimal Parse(string input, IFormatProvider formatProvider)
        {
            return Parse(input, formatProvider, "i");
        }

        public static ComplexDecimal Parse(string input, string imaginaryUnit)
        {
            return Parse(input, CultureInfo.CurrentCulture, imaginaryUnit);
        }

        public Complex ToComplex => new Complex(Convert.ToDouble(RealPart), Convert.ToDouble(ImaginaryPart));
        

        public static ComplexDecimal Parse(string input, IFormatProvider formatProvider, string imaginarySymbol)
        {
            /* this can ONLY parse first real part, and secondly imaginary part 
             the other order is NOT allowed.
             but it is possible to enter only the imaginary part, or only real part. 
             only ONE number each, this method cannot perform a sum 
            
             examples of supported input:
             2+2i
             +30-20i
             +0.3i
             i
             3
             -5
             -.08i
             .23+.45i
             0.97-0.15i
             -.78000E0003 - 6625.0200678E-0013i 

             */

            var numberFormat = NumberFormatInfo.GetInstance(formatProvider);

            var decimalSymbol = numberFormat.NumberDecimalSeparator;
            var positiveSymbol = numberFormat.PositiveSign;
            var negativeSymbol = numberFormat.NegativeSign;
            var exponentSymbol = "E";
            var numberSymbol = "#";

            string realSt = "";
            string imagSt = "";
            string tmpSt = "";

            int currentState = 0;

            input = input.Trim();

            var westernNumbers = new string[] { "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", };

            var states = new Dictionary<int, Dictionary<string, int>>();

            /* input symbol => next state */
            /* if a symbol is entered that has not a next state in the current state
               that is an invalid symbol, is an error, and an exception is thrown*/

            /* init state */
            states.Add(0, new Dictionary<string, int>()
                { { numberSymbol, 1 } ,
                  { positiveSymbol, 2 } ,
                  { negativeSymbol, 2 },
                  { decimalSymbol, 3 } ,
                  { imaginarySymbol, 5 } });

            /* the first number from init state has entered,
             * machine is parsing the integer part of the real part
             from now on, if a +- enters, the machine starts to
             parse the imaginary portion of the complex number */
            states.Add(1, new Dictionary<string, int>()
                { { numberSymbol, 1 },
                  { decimalSymbol, 3 },
                  { imaginarySymbol, 5 },
                  { exponentSymbol, 6},
                  { positiveSymbol, 10 },
                  { negativeSymbol, 10 }, });

            /* a +- symbol entered from init state,
             * this symbol is the sign of the real portion of the
             complex number */
            states.Add(2, new Dictionary<string, int>()
                { { numberSymbol, 1 },
                  { decimalSymbol, 3 } });

            /* integer part of the real part finished parsing, a 
             decimal separator entered, machine starts to parse
             the decimal part of the real portion of the complex number
             only a number is expected in this state */
            states.Add(3, new Dictionary<string, int>()
                { { numberSymbol, 4 } });

            /* first number has entered,  machine is now
             parsing the decimal part of the
             real portion of the complex number
             machine now can accept an exponential symbol E
            for start parsing the exponent of the real part 
            , or a +- symbol for start to parse the imaginary portion of
             the complex number */
            states.Add(4, new Dictionary<string, int>()
                { { numberSymbol, 4 },
                  { imaginarySymbol, 5 },
                  { exponentSymbol, 6 },
                  { positiveSymbol, 10 },
                  { negativeSymbol, 10 } });

            /* and imaginary unit symbol has entered, 
             * only thing expected here is the end of the string */
            states.Add(5, null);

            /* and exponential symbol entered, machine is now
             * parsing the exponent of the real portion of the complex,
               the exponent can have a sign */
            states.Add(6, new Dictionary<string, int>()
                { { positiveSymbol, 7 },
                  { negativeSymbol, 7 },
                  { numberSymbol, 8 } });

            /* a sign of the exponent of the real portion entered,
               from here, only a number can be entered, the first
               digit of the exponent of the real portion of the complex number*/
            states.Add(7, new Dictionary<string, int>()
                { { numberSymbol, 8} });

            /* machine is parsing the exponent of the real portion
               of the complex*/
            states.Add(8, new Dictionary<string, int>()
                { { imaginarySymbol, 5 },
                  { numberSymbol, 8 },
                  { positiveSymbol, 10 },
                  { negativeSymbol, 10 } });

            /* parsing the real portion has finished. machine starts to parse
               the imaginary portion */
            states.Add(10, new Dictionary<string, int>()
                { { imaginarySymbol, 5},
                  { numberSymbol, 11 },
                  { decimalSymbol, 15 } });

            /* a number entered, we are parsing the integer part
             * of the imaginary portion*/
            states.Add(11, new Dictionary<string, int>()
                { { imaginarySymbol, 5 },
                  { numberSymbol, 11 },
                  { exponentSymbol, 12 } ,
                  { decimalSymbol, 15 } });

            /* an exponent symbol entered in the imaginary portion */
            states.Add(12, new Dictionary<string, int>()
                { { positiveSymbol, 13 },
                  { negativeSymbol, 13 },
                  { numberSymbol, 14 } });

            /* the sign of the exponent of the imaginary portion entered,
             only a number is expected */
            states.Add(13, new Dictionary<string, int>()
                { { numberSymbol, 14 } });

            /* we are parsing the exponent of the imaginary portion */
            states.Add(14, new Dictionary<string, int>()
                { { numberSymbol, 14 },
                  { imaginarySymbol, 5 } });

            /* a decimal separator entered, machine starts to 
             parse the decimal part of the imaginary portion */
            states.Add(15, new Dictionary<string, int>()
                { { numberSymbol, 16 } });

            /* we are parsing the decimal part of the imaginary portion */
            states.Add(16, new Dictionary<string, int>()
                { { numberSymbol, 16 },
                  { imaginarySymbol, 5 },
                  { exponentSymbol, 12 } });

            string tmpChar;

            foreach (char a in input)
            {
                tmpChar = a.ToString();

                if (!String.IsNullOrWhiteSpace(tmpChar))
                {
                    if (westernNumbers.Contains(tmpChar)) tmpChar = "#";

                    if (!states[currentState].Keys.Contains(tmpChar))
                        throw new FormatException();

                    if ((currentState == 1) || (currentState == 4) || (currentState == 8))
                        if ((tmpChar == positiveSymbol) || (tmpChar == negativeSymbol))
                        {
                            realSt = tmpSt;
                            tmpSt = "";
                        }

                    if (a.ToString() != imaginarySymbol) tmpSt += a.ToString();

                    currentState = states[currentState][tmpChar];
                }
            }

            if (!((currentState == 1) ||
                (currentState == 4) ||
                (currentState == 5) ||
                (currentState == 8)))
            /* string finished in a invalid moment */
            { throw new FormatException("Complex number invalid format"); }

            if ((currentState == 1) ||
                (currentState == 4) ||
                (currentState == 8))
            {
                realSt = tmpSt;
            }

            if (currentState == 5)
                imagSt = tmpSt;

            var real = decimal.Parse(realSt, System.Globalization.NumberStyles.Float, formatProvider);
            var imag = decimal.Parse(imagSt, System.Globalization.NumberStyles.Float, formatProvider);

            return new ComplexDecimal(real, imag);
        }

    }
    

}
