using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Components;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Capacitor : SerializableComponent, IPassive, IVoltageCurrentOutput
    {
        public override string ElementLetter => "C";
        public override string ElementType => "Capacitor";

        private decimal capacitorValue;
        public decimal CapacitorValue
        {
            get => capacitorValue; 
            set { SetProperty(ref capacitorValue, value);
                  calculateFoQ();
                  OnPropertyChanged("ValueString");  
            }
        }

        private int capacitorModel;
        public int CapacitorModel
        {
            get => capacitorModel; 
            set { SetProperty(ref capacitorModel, value); }
        }

        private Precision componentPrecision;
        public Precision ComponentPrecision
        {
            get => componentPrecision; 
            set { SetProperty(ref componentPrecision, value);
                OnPropertyChanged("ValueString");
            }
        }

        private bool outputVoltageAcross;
        private bool outputCurrentThrough;

        public bool OutputVoltageAcross
        {
            get => outputVoltageAcross;
            set { SetProperty(ref outputVoltageAcross, value); raiseLayoutChanged(); }
        }

        public bool OutputCurrentThrough
        {
            get => outputCurrentThrough;
            set { SetProperty(ref outputCurrentThrough, value); raiseLayoutChanged(); }
        }

        public SampledFunction ResultVoltageCurve { get; set; } = new SampledFunction() { FunctionQuantity = "Voltage", FunctionUnit = "Volt" };
        public SampledFunction ResultCurrentCurve { get; set; } = new SampledFunction() { FunctionQuantity = "Current", FunctionUnit = "Amper" };

        private decimal ls;
        public decimal Ls
        {
            get => ls; 
            set { SetProperty(ref ls, value); calculateFoQ(); }
        }

        private decimal rs;
        public decimal Rs
        {
            get => rs; 
            set { SetProperty(ref rs, value); calculateFoQ(); }
        }


        private decimal rp;
        public decimal Rp
        {
            get => rp; 
            set { SetProperty(ref rp, value); calculateFoQ(); }
        }

        private decimal ew;
        public decimal Ew
        {
            get => ew; 
            set { SetProperty(ref ew, value); }
        }

        private decimal fo;
        public decimal Fo
        {
            get => fo; 
            set { SetProperty(ref fo, value); calculateRsLs(); }
        }

        private decimal q;
        public decimal Q
        {
            get => q; 
            set { SetProperty(ref q, value); calculateRsLs(); }
        }

        public bool AnyPrecisionSelected { get { return (ComponentPrecision == Precision.Arbitrary); } }

        public override byte QuantityOfTerminals { get => 2; set => throw new NotImplementedException(); }
        public Tuple<byte, byte> GetImpedanceTerminals => new Tuple<byte, byte>(0, 1);

        public Capacitor()
        {
            CapacitorValue = 1m;
            CapacitorModel = 0;
            
            SetProperty(ref ls, 1e-12m, "Ls");
            SetProperty(ref rs, 1e-12m, "Rs");
            SetProperty(ref rp, 1e12m, "Rp");
            calculateFoQ();

            ParametersControl = new CapacitorParametersControl(this);
            OnScreenElement = new CapacitorScreen(this);
        }


        private void calculateFoQ()
        {
            if (CapacitorValue == 0m) return;
            if (Rs == 0m) return;
            if (Ls == 0m) return;
            
            decimal dWo = DecimalMath.Sqrt(1m / (Ls * CapacitorValue));

            decimal dQ = (dWo * Ls) / Rs;
            decimal dFo = dWo / (2m * DecimalMath.Pi);

            SetProperty(ref fo, dFo, "Fo");
            SetProperty(ref q, dQ, "Q");
        }

        private void calculateRsLs()
        {
            decimal dWo = 2 * DecimalMath.Pi * Fo;

            //  double dLs = Math.Sqrt(Math.Abs( ((dQ * dQ * dR * dR) - (dR * dR)) / Math.Pow(dWo, 2) ));
            decimal dRs = 1m / (Q * dWo * CapacitorValue);
            decimal dLs = 1m / (CapacitorValue * dWo * dWo);

            SetProperty(ref ls, dLs, "Ls");
            SetProperty(ref rs, dRs, "Rs");
        }

        public string ValueString
        {
            get
            {
                // this one sets de String for the component in the schematic window
                string returnString;
                var conv = new DecimalEngrConverter() { ShortString = false };
                var convShort = new DecimalEngrConverter() { ShortString = true };

                if (AnyPrecisionSelected)
                    returnString = (string)conv.Convert(CapacitorValue, typeof(string), null, "");
                else
                    returnString = (string)convShort.Convert(CapacitorValue, typeof(string), null, "");

                return returnString + "F";
            }
        }

      
        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "CapacitorValue": CapacitorValue = (decimal)value; break;
                case "CapacitorModel": CapacitorModel = (int)value; break;
                case "ComponentPrecision": ComponentPrecision = (Precision)value; break;
                case "Ls": Ls = (decimal)value; break;
                case "Rp": Rp = (decimal)value; break;
                case "Rs": Rs = (decimal)value; break;
                case "Fo": Fo = (decimal)value; break;
                case "Q":  Q = (decimal)value; break;
                case "Ew": Ew = (decimal)value; break;
                case "OutputVoltageAcross": OutputVoltageAcross = (bool)value;break;
                case "OutputCurrentThrough": OutputCurrentThrough = (bool)value;break;
            }

            ResultVoltageCurve.Title = "Voltage Across Capacitor " + ElementName;
            ResultCurrentCurve.Title = "Current Through Capacitor " + ElementName;
        }

        public ComplexDecimal GetImpedance(decimal frequency)
        {
            var w = 2m * DecimalMath.Pi * frequency;

            var ZC = 1 / (ComplexDecimal.ImaginaryOne * w * CapacitorValue);
            var ZLs = ComplexDecimal.ImaginaryOne * w * Ls;

            switch (CapacitorModel)
            {
                case 0: return ZC;
                case 1: return (ZC + Rs + ZLs) | Rp;
                case 2: return (CapacitorModel * DecimalMath.Power(w, Ew)) / (ComplexDecimal.ImaginaryOne * w);
            }

            throw new NotImplementedException();
        }

        public ComplexDecimal GetAdmittance(decimal frequency) => GetImpedance(frequency).Reciprocal;

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            var output = new ComplexDecimal[2];

            byte otherTerminal = (terminal == 0) ? (byte)1 : (byte)0;

            output[terminal] = GetAdmittance(frequency);
            output[otherTerminal] = -GetAdmittance(frequency);

            return output;
        }
    }
}
