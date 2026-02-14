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
    public class CommandBindWire : ICircuitCommand
    {
        public string Title => "Bind " + Wire.ToString() + " terminal: " + WireTerminalNumber.ToString() + " Element: " + BoundedObject.ToString() + " Element Terminal: " + BoundedTerminal.ToString();

        public CommandType CommandType => CommandType.ReBuildAndCalculate;

        public SerializableWire Wire { get; set; }
        public byte WireTerminalNumber { get; set; }

        public SerializableElement BoundedObject { get; set; }
        public byte BoundedTerminal { get; set; }

        public bool PreviousStateBounded { get; set; }
        public SerializableElement PreviousBoundedObject { get; set; }
        public byte PreviuosBoundedTerminal { get; set; }

        public Point2D PreviousTerminalPosition { get; set; }

        public void execute()
        {
            Wire.doBind(WireTerminalNumber, BoundedObject, BoundedTerminal);
        }

        public void unExecute()
        {
            if (PreviousStateBounded)
                Wire.doBind(WireTerminalNumber, PreviousBoundedObject, PreviuosBoundedTerminal);
            else
            {
                Wire.unBind(WireTerminalNumber);
                Wire.updatePosition(PreviousTerminalPosition, WireTerminalNumber);
            };
        }

        public override string ToString()
        {
            return Title;
        }
    }
}
