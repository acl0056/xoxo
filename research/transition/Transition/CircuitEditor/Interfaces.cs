
using System;
using System.Collections.Generic;
using System.ComponentModel;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.Functions;
using Windows.Foundation;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Shapes;

namespace Easycoustics.Transition.CircuitEditor
{
    public interface ICircuitCommand
    {
        void execute();
        void unExecute();

        string Title { get; }

        CommandType CommandType { get; }

    }

    public interface ICircuitSelectable
    {
        void selected();
        void deselected(); 
        bool isInside(Rectangle rect);
        bool isClicked(Point2D point);
    }

    public interface ICircuitMovable
    {
        void moveRelative(Point2D vector);
        void moveRelativeCommand(Point2D vector);
    }

    public interface IPassive
    {
        ComplexDecimal GetImpedance(decimal frequency); /* not angular frequency */
        Tuple<byte,byte> GetImpedanceTerminals { get; }
    }

    public interface IVoltageCurrentOutput
    {
        SampledFunction ResultVoltageCurve { get; set; } 
        SampledFunction ResultCurrentCurve { get; set; }

        bool OutputVoltageAcross { get; set; }
        bool OutputCurrentThrough { get; set; }

        ComplexDecimal GetImpedance(decimal frequency);
    }

    public interface IImplicitGroundedComponent { }
    public interface IAlterSchematicCommand { }
    public interface IIsolateSection
    {
        byte[] getOtherTerminalsIsolated(byte terminal);
    }

    public interface IVoltageSource
    {
        byte PositiveTerminal { get; }
        byte NegativeTerminal { get; }
    }

    public interface IMeterComponent { }

    public interface IDependentVoltageSource
    {
        ComplexDecimal GetTransferFunction(decimal frequency);
        byte PositiveReferenceVoltageTerminal { get; }
        byte NegativeReferenceVoltageTerminal { get; }

    }

}