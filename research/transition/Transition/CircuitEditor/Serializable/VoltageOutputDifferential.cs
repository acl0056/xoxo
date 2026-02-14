using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.CircuitEditor.ParametersControls;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class VoltageOutputDifferential : SerializableComponent, IMeterComponent
    {
        public override string ElementLetter => "F";
        public override string ElementType => "Voltage Curve Output between Nodes";

        public override byte QuantityOfTerminals { get => 2; set => throw new NotImplementedException(); }

        public SampledFunction ResultVoltageCurve { get; set; } = new SampledFunction()
            { FunctionQuantity = "Voltage", FunctionUnit = "Volt" };

        private string description;
        public string Description
        {
            get => description;
            set { SetProperty(ref description, value); raiseLayoutChanged(); }
        }

        public VoltageOutputDifferential() : base()
        {
            Description = "Voltage Data";
            OnScreenElement = new VoltageOutputDifferentialScreen(this);
            ParametersControl = new VoltageOutputDifferentialParameters(this);
        }


        public override void SetProperty(string property, object value)
        {
            base.SetProperty(property, value);

            switch (property)
            {
                case "Description": Description = (string)value; break;
            }

            ResultVoltageCurve.Title = "Voltage at " + ElementName;

        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            return new ComplexDecimal[2] { 0, 0 };
        }
    }
}
