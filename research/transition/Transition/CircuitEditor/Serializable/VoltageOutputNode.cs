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
    public class VoltageOutputNode : SerializableComponent, IMeterComponent
    {
        public override string ElementLetter => "N";
        public override string ElementType => "Voltage Curve Output at Node";

        public override byte QuantityOfTerminals { get => 1; set => throw new NotImplementedException(); }

        public SampledFunction ResultVoltageCurve { get; set; } = new SampledFunction()
            { FunctionQuantity = "Voltage", FunctionUnit = "Volt" };

        private string description;
        public string Description { get => description; set { SetProperty(ref description, value); raiseLayoutChanged(); } }

        public VoltageOutputNode() : base()
        {
            Description = "Voltage Data";
            OnScreenElement = new VoltageOutputNodeScreen(this);
            ParametersControl = new VoltageOutputNodeParametersControl(this);
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
             return new ComplexDecimal[1] { 0 };
        }
    }
}
