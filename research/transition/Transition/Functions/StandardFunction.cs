using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;

namespace Easycoustics.Transition.Functions
{
    public class StandardTransferFunction : Function
    {

        private decimal _ao;
        public decimal Ao { get => _ao; set { _ao = value; RaiseFunctionChanged(new FunctionChangedEventArgs()); } }

        private decimal _fp;
        public decimal Fp { get => _fp; set { _fp = value; RaiseFunctionChanged(new FunctionChangedEventArgs()); } }

        private decimal _fz;
        public decimal Fz { get => _fz; set { _fz = value; RaiseFunctionChanged(new FunctionChangedEventArgs()); } }

        private decimal _qp;
        public decimal Qp { get => _qp; set { _qp = value; RaiseFunctionChanged(new FunctionChangedEventArgs()); } }

        private bool _invert;
        public bool Invert { get => _invert; set { _invert = value; RaiseFunctionChanged(new FunctionChangedEventArgs()); } }

        private bool _reverse;
        public bool Reverse { get => _reverse; set { _reverse = value; RaiseFunctionChanged(new FunctionChangedEventArgs()); } }

        public decimal wp { get => 2 * DecimalMath.Pi * Fp; }
        public decimal wz { get => 2 * DecimalMath.Pi * Fz; }

        
        //private List<decimal> FrequencyPoints => UserDesign.CurrentDesign.getFrequencyPoints();

        private string currentFunction;
        public string CurrentFunction
        {
            get => currentFunction; set
            {
                currentFunction = value;
                RaiseFunctionChanged(new FunctionChangedEventArgs()
                { Action = FunctionChangedEventArgs.FunctionChangeAction.Reset });
            }
        }
       
        public StandardTransferFunction()
        {
            _ao = 1;
            _fp = 1000;
            _fz = 1000;
            _qp = 1;
            _invert = false;
            _reverse = false;
            currentFunction = "LP1";
        }
        
        public override ComplexDecimal Calculate(decimal freq)
        {
            /* s = jw */
            return CalculateFromS(ComplexDecimal.ImaginaryOne * freq * 2 * DecimalMath.Pi);
        }

        public ComplexDecimal CalculateFromS(ComplexDecimal s)
        {
            /* here s is equal to jw */

            ComplexDecimal output = 0;

            switch (CurrentFunction)
            {
                case "LP1":
                    output = Ao / (1 + (s / wp));
                    break;

                case "HP1":
                    output = (Ao * s / wp) / (1 + (s / wp));
                    break;

                case "AP1":
                    output = (Ao * (1 - (s / wp))) / (1 + (s / wp));
                    break;

                case "LP2":
                    output = Ao / (1 + (s / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)));
                    break;

                case "HP2":
                    output = (Ao * ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)) / (1 + (s / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)));
                    break;

                case "AP2":
                    output = (Ao * (1 - (s / Qp * wp) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)))) / (1 + (s / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)));
                    break;

                case "BP1":
                    output = (Ao * (s / (Qp * wp))) / (1 + (s / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)));
                    break;

                case "BR1":
                    output = (Ao * (1 + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wz, 2)))) / (1 + (s / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)));
                    break;

                case "LP12":
                    output = Ao / ComplexDecimal.Sqrt(1 + (s / wp));
                    break;

                case "HP12":
                    output = Ao * ComplexDecimal.Sqrt((s / wp) / (1 + (s / wp)));
                    break;

                case "LEQ":
                    if (Ao >= 1)
                        output = (Ao + (s / wp)) / (1 + (s / wp));
                    else
                        output = (1 + (s / wp)) / ((1 / Ao) + (s / wp));
                    break;

                case "HEQ":
                    if (Ao >= 1)
                        output = (1 + (Ao * (s / wp))) / (1 + (s / wp));
                    else
                        output = (1 + (s / wp)) / (1 + (s / (Ao * wp)));
                    break;

                case "BEQ":
                    if (Ao >= 1)
                        output = (1 + ((Ao * s) / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2))) /
                               (1 + (s / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)));
                    else
                        output = (1 + (s / (Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2))) /
                               (1 + (s / (Ao * Qp * wp)) + (ComplexDecimal.Pow(s, 2) / ComplexDecimal.Pow(wp, 2)));
                    break;

                case "Sinc":
                    decimal w = (s / ComplexDecimal.ImaginaryOne).Magnitude;
                    decimal fs = Fp;
                    decimal lambda = w / (2 * fs);
                    output = Ao * (DecimalMath.Sin(lambda) / lambda) * ComplexDecimal.Exp((-1 * s) / (2 * fs));
                    break;

                 default: throw new NotSupportedException();
            }

            if (Invert) output = ComplexDecimal.GetReciprocal(output);
            if (Reverse) output = ComplexDecimal.Negate(output);

            return output;
        }

        public override object Clone()
        {
            throw new NotImplementedException();
        }
    }
    
}
