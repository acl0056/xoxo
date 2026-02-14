using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor.Components;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.CircuitEditor.Serializable
{
    public class Ground : SerializableComponent
    {
        public override string ElementLetter => "G";
        public override string ElementType => "Ground";

        public override byte QuantityOfTerminals { get => 1; set => throw new NotImplementedException(); }

        public Ground()
        {
            OnScreenElement = new GroundScreen(this);
            ParametersControl = new GroundParameters(this);
        }

        public override ComplexDecimal[] GetAdmittancesForTerminal(byte terminal, decimal frequency)
        {
            throw new NotImplementedException();
        }
    }
}
