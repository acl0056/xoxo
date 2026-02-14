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
    public class FDNR : SerializableComponent, IPassive, IVoltageCurrentOutput
    {
        public override string ElementLetter => "D";
        public override string ElementType => "Frequency Dependent Negative Resistor";

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

        private decimal fdnrValue;
        public decimal FdnrValue
        {
            get { return fdnrValue; }
            set { SetProperty(ref fdnrValue, value);
                OnPropertyChanged("ValueString");
            }
        }

        private Precision componentPrecision;
        public Precision ComponentPrecision
        {
            get { return componentPrecision; }
            set
            {
                SetProperty(ref componentPrecision, value);
                OnPropertyChanged("ValueString");
            }
        }

        public bool AnyPrecisionSelected { get { return (ComponentPrecision == Precision.Arbitrary); } }

        public override byte QuantityOfTerminals { get => 2; set => throw new NotImplementedException(); }

        public FDNR() : base()
        {
            FdnrValue = 1m;
            
            ParametersControl = new FDNRParametersControl(this);
            OnScreenElement = new FDNRScreen(this);
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
                    returnString = (string)conv.Convert(FdnrValue, typeof(string), null, "");
                else
                    returnString = (string)convShort.Convert(FdnrValue, typeof(string), null, "");

                return returnString + "F²";
            }
        }

        public SampledFunction ResultVoltageCurve { get; set; } = new SampledFunction() { FunctionQuantity = "Voltage", FunctionUnit = "Volt" };
        public SampledFunction ResultCurrentCurve { get; set; } = new SampledFunction() { FunctionQuantity = "Current", FunctionUnit = "Amper" };

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "FdnrValue": FdnrValue = (decimal)value; break;
                case "ComponentPrecision": ComponentPrecision = (Precision)value; break;

                case "OutputVoltageAcross": OutputVoltageAcross = (bool)value; break;
                case "OutputCurrentThrough": OutputCurrentThrough = (bool)value; break;

            }

            ResultVoltageCurve.Title = "Voltage Across FDNR " + ElementName;
            ResultCurrentCurve.Title = "Current Through FDNR " + ElementName;
        }

        public ComplexDecimal GetImpedance(decimal frequency)
        {
            /* w is angular frequency
             w= 2 * Pi * F 
             */
            decimal w = 2 * DecimalMath.Pi * frequency;
            return -1 / (w * w * FdnrValue);
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

        public Tuple<byte, byte> GetImpedanceTerminals => new Tuple<byte, byte>(0, 1);
    }
}
