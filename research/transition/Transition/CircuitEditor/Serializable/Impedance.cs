using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Components;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Impedance : SerializableComponent, IPassive, IVoltageCurrentOutput
    {
        public override string ElementLetter => "Z";
        public override string ElementType => "Impedance";


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

        public override byte QuantityOfTerminals { get => 2; set => throw new NotImplementedException(); }
        public Tuple<byte, byte> GetImpedanceTerminals => new Tuple<byte, byte>(0, 1);

        private string description;
        public string Description { get => description;
            set {
                SetProperty(ref description, value);
                raiseLayoutChanged();
            }
        }

        private Function functionImpedance;
        public Function FunctionImpedance { get => functionImpedance;
            set { SetProperty(ref functionImpedance, value); }
        }

        public SampledFunction ResultVoltageCurve { get; set; } = new SampledFunction();
        public SampledFunction ResultCurrentCurve { get; set; } = new SampledFunction();

        public Impedance() : base()
        {
            functionImpedance = new ConstantValueFunction(1);
            description = "Z";

            ParametersControl = new ImpedanceParametersControl(this);
            OnScreenElement = new ImpedanceScreen(this);
        }

        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "Description": Description = (string)value; break;
                case "FunctionImpedance": FunctionImpedance = (Function)value; break;
                case "OutputVoltageAcross": OutputVoltageAcross = (bool)value; break;
                case "OutputCurrentThrough": OutputCurrentThrough = (bool)value; break;
            }
            
            ResultVoltageCurve.Title = "Voltage Across Impedance " + ElementName;
            ResultCurrentCurve.Title = "Current Through Impedance " + ElementName;
        }

        public ComplexDecimal GetImpedance(decimal frequency)
        {
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
