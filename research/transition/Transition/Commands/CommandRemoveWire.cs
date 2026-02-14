using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Design;

namespace Easycoustics.Transition.Commands
{
    public class CommandRemoveWire : ICircuitCommand
    {
        public CommandType CommandType => CommandType.ReBuildAndCalculate;

        public string Title => "Remove Wire Command: " + Wire.ToString();
        public override string ToString() => Title;

        public SerializableWire Wire { get; set; }

        public void execute()
        {
            UserDesign.CurrentDesign.Wires.Remove(Wire);
        }

        public void unExecute()
        {
            UserDesign.CurrentDesign.Wires.Add(Wire);
        }
    }
}
