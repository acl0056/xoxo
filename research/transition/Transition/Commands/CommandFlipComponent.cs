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
    public class CommandFlipComponent : ICircuitCommand
    {
        public string Title => (IsFlipY ? "FlipY" : "FlipX") + " " + NewValue.ToString() + " Component " + Component.ToString();

        public CommandType CommandType => CommandType.DontCalculate;

        public SerializableComponent Component { get; set; }
        public bool IsFlipY { get; set; }
        public bool NewValue { get; set; }

        public override string ToString() => Title;

        public void execute()
        {
            if (IsFlipY) Component.FlipY = NewValue; else Component.FlipX = NewValue;
        }

        public void unExecute()
        {
            if (IsFlipY) Component.FlipY = !NewValue; else Component.FlipX = !NewValue;
        }
    }
}
