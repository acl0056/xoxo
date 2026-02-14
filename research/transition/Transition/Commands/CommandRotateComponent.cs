using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.Commands
{
    public class CommandRotateComponent : ICircuitCommand
    {
        public CommandType CommandType => CommandType.DontCalculate;

        public string Title => "Rotate Component " + Component.ToString() + " From rotation " + oldValue.ToString() + " to " + newValue.ToString();

        public double oldValue { get; set; }
        public double newValue { get; set; }

        public SerializableComponent Component { get; set; }

        public void execute()
        {
            Component.Rotation = newValue;
        }

        public void unExecute()
        {
            Component.Rotation = oldValue;
        }

        public override string ToString() => Title;
    }
}
